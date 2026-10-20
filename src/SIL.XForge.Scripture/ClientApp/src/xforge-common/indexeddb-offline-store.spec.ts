import { environment } from '../environments/environment';
import { IndexeddbOfflineStore } from './indexeddb-offline-store';
import { RealtimeDocConstructor } from './models/realtime-doc';
import { OfflineData } from './offline-store';
import { TypeRegistry } from './type-registry';

const DATABASE_NAME = 'xforge';

class TestDoc {
  static readonly COLLECTION = 'test_docs';
  static readonly INDEX_PATHS = ['projectRef', { projectRef: 1, bookNum: 1 }];
}

class OtherDoc {
  static readonly COLLECTION = 'other_docs';
  static readonly INDEX_PATHS = ['projectRef'];
}

describe('IndexeddbOfflineStore', () => {
  let store: IndexeddbOfflineStore;

  beforeEach(async () => {
    await deleteDatabase();
    const typeRegistry = new TypeRegistry([TestDoc, OtherDoc] as unknown as RealtimeDocConstructor[], [], ['custom']);
    store = new IndexeddbOfflineStore(typeRegistry);
  });

  afterEach(async () => {
    await store.deleteDB();
  });

  it('creates object stores and indexes for a new database', async () => {
    await store.getAll(TestDoc.COLLECTION);

    const indexes = await getIndexes();
    expect(Object.keys(indexes).sort()).toEqual(['custom', 'other_docs', 'test_docs']);
    expect(indexes['test_docs']).toEqual({
      projectRef: 'data.projectRef',
      projectRef_bookNum: ['data.projectRef', 'data.bookNum']
    });
    expect(indexes['other_docs']).toEqual({ projectRef: 'data.projectRef' });
    expect(indexes['custom']).toEqual({});
  });

  it('updates the indexes of existing object stores when the database version changes', async () => {
    // Create a database from an older version, where an index is missing, an index has a different key path,
    // and there is an index that is no longer used
    await createDatabase(environment.offlineDBVersion - 1, db => {
      const testDocs = db.createObjectStore(TestDoc.COLLECTION, { keyPath: 'id' });
      testDocs.createIndex('projectRef_bookNum', ['data.projectRef', 'data.chapterNum']);
      testDocs.createIndex('removed', 'data.removed');
      testDocs.put({ id: 'doc01', data: { projectRef: 'project01', bookNum: 40 } });
      testDocs.put({ id: 'doc02', data: { projectRef: 'project02', bookNum: 40 } });
    });

    const { results } = await store.query(TestDoc.COLLECTION, { projectRef: 'project01' });

    expect((results as OfflineData[]).map(r => r.id)).toEqual(['doc01']);
    const indexes = await getIndexes();
    expect(Object.keys(indexes).sort()).toEqual(['custom', 'other_docs', 'test_docs']);
    expect(indexes['test_docs']).toEqual({
      projectRef: 'data.projectRef',
      projectRef_bookNum: ['data.projectRef', 'data.bookNum']
    });
    expect(await store.getAllIds(TestDoc.COLLECTION)).toEqual(['doc01', 'doc02']);
  });

  async function getIndexes(): Promise<{ [store: string]: { [index: string]: string | string[] } }> {
    const db = await openDatabase();
    const result: { [store: string]: { [index: string]: string | string[] } } = {};
    const storeNames = Array.from(db.objectStoreNames);
    const transaction = db.transaction(storeNames);
    for (const storeName of storeNames) {
      const objectStore = transaction.objectStore(storeName);
      result[storeName] = {};
      for (const indexName of Array.from(objectStore.indexNames)) {
        result[storeName][indexName] = objectStore.index(indexName).keyPath;
      }
    }
    db.close();
    return result;
  }
});

function openDatabase(version?: number, upgrade?: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => upgrade?.(request.result);
  });
}

async function createDatabase(version: number, upgrade: (db: IDBDatabase) => void): Promise<void> {
  const db = await openDatabase(version, upgrade);
  db.close();
}

function deleteDatabase(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(DATABASE_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
