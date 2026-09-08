import { Injectable } from '@angular/core';
import { isObj } from '../type-utils';

const DATABASE_NAME = 'xforge-error-reports';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'reports';
/** Reports that cannot be delivered within this time are unlikely to still be of interest. */
const MAX_REPORT_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Bound on how much space the store can take up if reports are never able to be delivered. */
const MAX_REPORT_COUNT = 50;

/**
 * An error report that could not be sent when the error occurred (usually because the user was offline), stored so it
 * can be sent later. It contains what is needed to recreate the error, rather than an error object, because only
 * structured data can be stored in IndexedDB.
 */
export interface StoredErrorReport {
  id: string;
  /** When the error occurred, which may be long before the report can be sent. */
  timestamp: number;
  name: string;
  message: string;
  stack?: string;
  /** The page the user was on when the error occurred, which is not where they will be when it is sent. */
  url: string;
  unhandled: boolean;
  metadata: { [tabName: string]: object };
}

/**
 * Converts an error nested in error report metadata to a plain object, because errors are not preserved by
 * JSON.stringify.
 */
function replaceErrors(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

/**
 * This class stores error reports in IndexedDB while they cannot be sent to the error reporting service, so that they
 * survive the user closing the app, and can be sent once the user is online again.
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorReportStore {
  private openDBPromise?: Promise<IDBDatabase>;

  /** Stores a report, discarding stale or excess reports so the store cannot grow without limit. */
  async add(report: StoredErrorReport): Promise<void> {
    const storableReport: StoredErrorReport = {
      ...report,
      metadata: ErrorReportStore.toStorableMetadata(report.metadata)
    };
    const db: IDBDatabase = await this.openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      transaction.objectStore(OBJECT_STORE_NAME).put(storableReport);
      transaction.oncomplete = () => resolve();
      // The transaction is aborted if the storage quota has been exceeded.
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
    await this.discardUnreportableReports();
  }

  /** Gets the stored reports, oldest first, so that reports are sent in the order the errors occurred. */
  async getAll(): Promise<StoredErrorReport[]> {
    const db: IDBDatabase = await this.openDB();
    const reports = await new Promise<StoredErrorReport[]>((resolve, reject) => {
      const request = db.transaction(OBJECT_STORE_NAME).objectStore(OBJECT_STORE_NAME).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return reports.sort((a, b) => a.timestamp - b.timestamp);
  }

  async remove(id: string): Promise<void> {
    const db: IDBDatabase = await this.openDB();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(OBJECT_STORE_NAME, 'readwrite').objectStore(OBJECT_STORE_NAME).delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private static toStorableMetadata(metadata: { [tabName: string]: object }): { [tabName: string]: object } {
    const storableMetadata: { [tabName: string]: object } = {};
    for (const tabName of Object.keys(metadata)) {
      // Metadata can hold anything, including values that IndexedDB is unable to store, such as class instances
      // holding functions. Sections that cannot be converted to plain data are left out rather than risk losing the
      // whole report.
      try {
        const plainData: unknown = JSON.parse(JSON.stringify(metadata[tabName], replaceErrors));
        if (isObj(plainData)) {
          storableMetadata[tabName] = plainData;
        }
      } catch {
        // Leave this section out of the report
      }
    }
    return storableMetadata;
  }

  private async discardUnreportableReports(): Promise<void> {
    const reports: StoredErrorReport[] = await this.getAll();
    const oldestTimestampToKeep: number = Date.now() - MAX_REPORT_AGE_MS;
    const excessCount: number = Math.max(reports.length - MAX_REPORT_COUNT, 0);
    for (const [index, report] of reports.entries()) {
      if (index < excessCount || report.timestamp < oldestTimestampToKeep) {
        await this.remove(report.id);
      }
    }
  }

  private openDB(): Promise<IDBDatabase> {
    if (this.openDBPromise == null) {
      this.openDBPromise = new Promise<IDBDatabase>((resolve, reject) => {
        if (window.indexedDB == null) {
          return reject(new Error('IndexedDB is not available in this browser.'));
        }
        const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          // Close on version change so a different tab/window is not blocked
          db.onversionchange = () => {
            db.close();
            this.openDBPromise = undefined;
          };
          resolve(db);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
          }
        };
      });
    }
    return this.openDBPromise;
  }
}
