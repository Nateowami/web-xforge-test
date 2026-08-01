import { QueryParameters, QueryResults } from './query-parameters';

export interface OfflineData {
  id: string;
}

/**
 * The properties of the stored data that indicate whether it has been saved to the server. Realtime docs store the ops
 * that have not been acknowledged by the server, and files that are waiting to be uploaded have no online url.
 */
interface UnsavedDataIndicators {
  pendingOps?: unknown[];
  blob?: Blob;
  onlineUrl?: string;
  deleteRef?: string;
}

/**
 * Determines whether a record in the offline store contains changes that have not been saved to the server.
 */
function isUnsavedData(data: OfflineData): boolean {
  const record = data as OfflineData & UnsavedDataIndicators;
  return (
    (record.pendingOps != null && record.pendingOps.length > 0) ||
    record.deleteRef != null ||
    (record.blob != null && record.onlineUrl == null)
  );
}

/**
 * This is the abstract base class for offline store implementations. An offline store is responsible for saving and
 * retrieving offline data in the browser.
 */
export abstract class OfflineStore {
  abstract getAllIds(collection: string): Promise<string[]>;
  abstract getAll<T extends OfflineData>(collection: string): Promise<T[]>;
  abstract query<T extends OfflineData>(collection: string, parameters: QueryParameters): Promise<QueryResults<T>>;
  abstract get<T extends OfflineData>(collection: string, id: string): Promise<T | undefined>;
  abstract put(collection: string, offlineData: OfflineData): Promise<void>;
  abstract delete(collection: string, id: string): Promise<void>;
  abstract deleteDB(): Promise<void>;

  /** The names of the collections that offline data can be stored in. */
  abstract get collections(): string[];

  /**
   * Determines whether the store holds any changes that have not been saved to the server, i.e. edits or recordings
   * that were made while offline. This data is lost when the store is deleted, such as when logging out.
   */
  async hasUnsavedChanges(): Promise<boolean> {
    for (const collection of this.collections) {
      const data = await this.getAll(collection);
      if (data.some(isUnsavedData)) {
        return true;
      }
    }
    return false;
  }
}
