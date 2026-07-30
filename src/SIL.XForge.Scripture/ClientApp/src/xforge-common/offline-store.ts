import { QueryParameters, QueryResults } from './query-parameters';

export interface OfflineData {
  id: string;
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
  /**
   * Deletes the offline database.
   *
   * @param {boolean} [preventFurtherUse=false] Indicates whether the store should refuse all further operations. This
   * is used when logging out, where the app keeps running (and keeps saving) until the browser navigates away, so
   * that saves in progress neither fail nor restore the data that was just deleted.
   */
  abstract deleteDB(preventFurtherUse?: boolean): Promise<void>;
}
