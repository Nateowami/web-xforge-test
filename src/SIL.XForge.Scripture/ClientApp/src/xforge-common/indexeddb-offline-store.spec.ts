import { environment } from '../environments/environment';
import { IndexeddbOfflineStore } from './indexeddb-offline-store';
import { RealtimeDoc } from './models/realtime-doc';
import { TypeRegistry } from './type-registry';

const DATABASE_NAME = 'xforge';
const COLLECTION = 'test_docs';

describe('IndexeddbOfflineStore', () => {
  beforeEach(async () => {
    await TestEnvironment.deleteDatabase();
  });

  afterEach(async () => {
    await TestEnvironment.deleteDatabase();
  });

  it('creates the indexes of a doc type when the database is created', async () => {
    const env = new TestEnvironment();

    // SUT
    await env.store.getAllIds(COLLECTION);

    expect(await env.getIndexNames()).toEqual(['projectRef', 'projectRef_bookNum']);
    await env.store.deleteDB();
  });

  it('adds indexes that were defined after the database was created', async () => {
    const env = new TestEnvironment();
    await env.createDatabaseAtPreviousVersion(['projectRef']);

    // SUT
    await env.store.getAllIds(COLLECTION);

    expect(await env.getIndexNames()).toEqual(['projectRef', 'projectRef_bookNum']);
    await env.store.deleteDB();
  });

  it('indexes existing data when an index is added', async () => {
    const env = new TestEnvironment();
    await env.createDatabaseAtPreviousVersion([]);

    // SUT
    await env.store.getAllIds(COLLECTION);

    expect(await env.getDocIdsFromIndex('projectRef', 'project01')).toEqual(['doc01']);
    await env.store.deleteDB();
  });

  it('removes indexes that are no longer defined', async () => {
    const env = new TestEnvironment();
    await env.createDatabaseAtPreviousVersion(['projectRef', 'obsolete']);

    // SUT
    await env.store.getAllIds(COLLECTION);

    expect(await env.getIndexNames()).toEqual(['projectRef', 'projectRef_bookNum']);
    await env.store.deleteDB();
  });
});

interface TestData {
  projectRef: string;
  bookNum: number;
}

/** A doc type that exists only so that this spec has indexes to create in IndexedDB. */
class TestDoc extends RealtimeDoc<TestData> {
  static readonly COLLECTION = COLLECTION;
  static readonly INDEX_PATHS = ['projectRef', { projectRef: 1, bookNum: 1 }];
}

class TestEnvironment {
  readonly store: IndexeddbOfflineStore = new IndexeddbOfflineStore(new TypeRegistry([TestDoc], [], []));

  static deleteDatabase(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase(DATABASE_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Creates the database as an older version of the application would have, i.e. with only the indexes that were
   * defined at the time, and containing a document.
   */
  createDatabaseAtPreviousVersion(indexNames: string[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, environment.offlineDBVersion - 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const objectStore = request.result.createObjectStore(COLLECTION, { keyPath: 'id' });
        for (const indexName of indexNames) {
          objectStore.createIndex(indexName, `data.${indexName}`);
        }
        objectStore.put({ id: 'doc01', data: { projectRef: 'project01', bookNum: 40 } });
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
    });
  }

  getDocIdsFromIndex(indexName: string, key: IDBValidKey): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const index = db.transaction(COLLECTION).objectStore(COLLECTION).index(indexName);
        const getAllRequest = index.getAllKeys(IDBKeyRange.only(key));
        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => {
          db.close();
          resolve(getAllRequest.result.map(docKey => docKey.toString()));
        };
      };
    });
  }

  getIndexNames(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const objectStore = db.transaction(COLLECTION).objectStore(COLLECTION);
        const indexNames = Array.from(objectStore.indexNames).sort();
        db.close();
        resolve(indexNames);
      };
    });
  }
}
