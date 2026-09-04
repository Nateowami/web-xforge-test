import { Injectable } from '@angular/core';
import { isObjectLike } from 'lodash-es';
import { environment } from '../environments/environment';
import { OfflineData, OfflineStore } from './offline-store';
import { performQuery, PropertyFilter, QueryParameters, QueryResults } from './query-parameters';
import { TypeRegistry } from './type-registry';

const DATABASE_NAME = 'xforge';

function getAllFromCursor<T extends OfflineData>(
  store: IDBObjectStore | IDBIndex,
  query?: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const request = store.getAll(query);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getKeyRange(filter: PropertyFilter): IDBKeyRange | undefined {
  if (filter === undefined) {
    return undefined;
  }

  if (isObjectLike(filter)) {
    if (filter['$eq'] !== undefined) {
      return IDBKeyRange.only(filter['$eq']);
    }
    return undefined;
  }
  return IDBKeyRange.only(filter);
}

interface IndexSpec {
  name: string;
  keyPath: string | string[];
}

function getIndexSpecs(indexPaths?: (string | { [x: string]: number | string } | [string, unknown])[]): IndexSpec[] {
  if (indexPaths == null) {
    return [];
  }
  return indexPaths.map((path): IndexSpec => {
    if (typeof path === 'string') {
      return { name: path, keyPath: `data.${path}` };
    } else if (Array.isArray(path)) {
      // Index options are not supported in IndexedDB, so we ignore them.
      return { name: path[0], keyPath: `data.${path[0]}` };
    } else {
      const keys: string[] = Object.keys(path);
      return { name: keys.join('_'), keyPath: keys.map(key => `data.${key}`) };
    }
  });
}

function createObjectStore(
  db: IDBDatabase,
  collection: string,
  indexPaths?: (string | { [x: string]: number | string } | [string, unknown])[]
): void {
  const objectStore = db.createObjectStore(collection, { keyPath: 'id' });
  for (const index of getIndexSpecs(indexPaths)) {
    objectStore.createIndex(index.name, index.keyPath);
  }
}

/**
 * Brings the indexes of an object store that already exists in the database into line with the indexes that the
 * application currently defines. Without this, indexes added to a doc type would only ever exist for users who create
 * the database from scratch, i.e. after logging out and back in again.
 */
function updateObjectStoreIndexes(
  transaction: IDBTransaction,
  collection: string,
  indexPaths?: (string | { [x: string]: number | string } | [string, unknown])[]
): void {
  const objectStore = transaction.objectStore(collection);
  const indexes: IndexSpec[] = getIndexSpecs(indexPaths);
  for (const indexName of Array.from(objectStore.indexNames)) {
    const index: IndexSpec | undefined = indexes.find(i => i.name === indexName);
    // The key path of an existing index cannot be changed, so the index has to be recreated if it has changed.
    if (index == null || String(objectStore.index(indexName).keyPath) !== String(index.keyPath)) {
      objectStore.deleteIndex(indexName);
    }
  }
  for (const index of indexes) {
    if (!objectStore.indexNames.contains(index.name)) {
      objectStore.createIndex(index.name, index.keyPath);
    }
  }
}

/**
 * This class is an IndexedDB-based implementation of the real-time offline store.
 */
@Injectable({
  providedIn: 'root'
})
export class IndexeddbOfflineStore extends OfflineStore {
  private openDBPromise?: Promise<IDBDatabase>;

  constructor(private readonly typeRegistry: TypeRegistry) {
    super();
  }

  async getAllIds(collection: string): Promise<string[]> {
    const db = await this.openDB();

    const transaction = db.transaction(collection);
    const objectStore = transaction.objectStore(collection);

    return await new Promise<string[]>((resolve, reject) => {
      const results: string[] = [];
      const request = objectStore.openKeyCursor();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor != null) {
          results.push(cursor.key.toString());
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  async getAll<T extends OfflineData>(collection: string): Promise<T[]> {
    const db = await this.openDB();

    const transaction = db.transaction(collection);
    const objectStore = transaction.objectStore(collection);

    return await getAllFromCursor(objectStore);
  }

  /** When offline this may return or it might wait until the user comes online before returning. */
  async get<T extends OfflineData>(collection: string, id: string): Promise<T | undefined> {
    const db = await this.openDB();

    const transaction = db.transaction(collection);
    const objectStore = transaction.objectStore(collection);

    return await new Promise<T>((resolve, reject) => {
      const request = objectStore.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async query<T extends OfflineData>(collection: string, parameters: QueryParameters): Promise<QueryResults<T>> {
    const db = await this.openDB();
    const transaction = db.transaction(collection);
    const objectStore = transaction.objectStore(collection);
    let snapshots: T[] | undefined;
    for (const key of Object.keys(parameters)) {
      if (objectStore.indexNames.contains(key)) {
        const filter = parameters[key] as PropertyFilter;
        const keyRange = getKeyRange(filter);
        if (keyRange !== undefined) {
          const index = objectStore.index(key);
          snapshots = await getAllFromCursor(index, keyRange);
          break;
        }
      }
    }
    snapshots ??= await this.getAll(collection);
    return performQuery(parameters, snapshots);
  }

  async put(collection: string, offlineData: OfflineData): Promise<void> {
    const db = await this.openDB();

    const transaction = db.transaction(collection, 'readwrite');
    const objectStore = transaction.objectStore(collection);

    await new Promise<void>((resolve, reject) => {
      const request = objectStore.put(offlineData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      // The transaction is aborted if the storage quota has been exceeded. We want to handle that if it happens.
      transaction.onabort = event => {
        const target = event.target as IDBTransaction;
        reject(target.error);
      };
    });
  }

  async delete(collection: string, id: string): Promise<void> {
    const db = await this.openDB();

    const transaction = db.transaction(collection, 'readwrite');
    const objectStore = transaction.objectStore(collection);

    await new Promise<void>((resolve, reject) => {
      const request = objectStore.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteDB(): Promise<void> {
    await this.closeDB();
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase(DATABASE_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private openDB(): Promise<IDBDatabase> {
    if (this.openDBPromise != null) {
      return this.openDBPromise;
    }
    this.openDBPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (!window.indexedDB) {
        return reject(new Error('IndexedDB is not available in this browser. Please use a different browser.'));
      }
      // environment.offlineDBVersion must be incremented when object stores or their indexes change, as the
      // database schema is only updated when the version changes.
      const request = window.indexedDB.open(DATABASE_NAME, environment.offlineDBVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        // close on version change so we don't block the deletion of the database from a different tab/window
        db.onversionchange = () => this.closeDB();
        resolve(db);
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        const transaction: IDBTransaction | null = request.transaction;
        if (transaction == null) {
          return reject(new Error('The IndexedDB upgrade transaction is not available.'));
        }
        const storeNames = db.objectStoreNames;
        for (const docType of this.typeRegistry.docTypes) {
          if (storeNames.contains(docType.COLLECTION)) {
            updateObjectStoreIndexes(transaction, docType.COLLECTION, docType.INDEX_PATHS);
          } else {
            createObjectStore(db, docType.COLLECTION, docType.INDEX_PATHS);
          }
        }
        for (const fileType of this.typeRegistry.fileTypes) {
          if (!storeNames.contains(fileType)) {
            createObjectStore(db, fileType);
          }
        }
        for (const featureType of this.typeRegistry.customTypes) {
          if (!storeNames.contains(featureType)) {
            createObjectStore(db, featureType);
          }
        }
      };
    });
    return this.openDBPromise;
  }

  private async closeDB(): Promise<void> {
    if (this.openDBPromise != null) {
      const db = await this.openDBPromise;
      db.close();
      this.openDBPromise = undefined;
    }
  }
}
