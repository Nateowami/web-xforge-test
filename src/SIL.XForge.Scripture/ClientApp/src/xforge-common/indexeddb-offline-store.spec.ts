import { environment } from '../environments/environment';
import { IndexeddbOfflineStore } from './indexeddb-offline-store';
import { RealtimeDocConstructor } from './models/realtime-doc';
import { TypeRegistry } from './type-registry';

const DATABASE_NAME = 'xforge';

describe('IndexeddbOfflineStore', () => {
  let store: IndexeddbOfflineStore | undefined;

  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(async () => {
    await store?.deleteDB();
    store = undefined;
    await deleteDatabase();
  });

  it('creates object stores and indexes for a new database', async () => {
    store = createStore(['projectRef', { projectRef: 1, bookNum: 1 }, ['name', { unique: true }]]);

    await store.getAll('test_docs');

    const indexes = await getIndexes('test_docs');
    expect(indexes).toEqual({
      projectRef: 'data.projectRef',
      projectRef_bookNum: ['data.projectRef', 'data.bookNum'],
      name: 'data.name'
    });
  });

  it('updates the indexes of an existing object store when the database is upgraded', async () => {
    await createDatabase(environment.offlineDBVersion - 1, db => {
      const objectStore = db.createObjectStore('test_docs', { keyPath: 'id' });
      objectStore.createIndex('removed', 'data.removed');
      objectStore.createIndex('projectRef_bookNum', ['data.projectRef', 'data.chapterNum']);
      objectStore.put({ id: 'doc01', data: { projectRef: 'project01', bookNum: 40 } });
      objectStore.put({ id: 'doc02', data: { projectRef: 'project02', bookNum: 40 } });
    });
    store = createStore(['projectRef', { projectRef: 1, bookNum: 1 }]);
    // query() falls back to reading the whole store if there is no index for the query, so check that it used one
    const indexGetAll = spyOn(IDBIndex.prototype, 'getAll').and.callThrough();

    const results = await store.query<any>('test_docs', { projectRef: 'project01' });

    expect(indexGetAll).toHaveBeenCalledTimes(1);
    expect((results.results as any[]).map(r => r.id)).toEqual(['doc01']);
    expect((await store.getAll('test_docs')).length).toBe(2);
    const indexes = await getIndexes('test_docs');
    expect(indexes).toEqual({ projectRef: 'data.projectRef', projectRef_bookNum: ['data.projectRef', 'data.bookNum'] });
  });

  it('does not change indexes if the database version is unchanged', async () => {
    await createDatabase(environment.offlineDBVersion, db => {
      db.createObjectStore('test_docs', { keyPath: 'id' });
    });
    store = createStore(['projectRef']);

    await store.getAll('test_docs');

    expect(await getIndexes('test_docs')).toEqual({});
  });

  function createStore(indexPaths: RealtimeDocConstructor['INDEX_PATHS']): IndexeddbOfflineStore {
    const docType = { COLLECTION: 'test_docs', INDEX_PATHS: indexPaths } as RealtimeDocConstructor;
    return new IndexeddbOfflineStore(new TypeRegistry([docType], [], []));
  }

  async function getIndexes(collection: string): Promise<{ [name: string]: string | string[] }> {
    // Close the store's connection so that the database can be opened here
    await store!['closeDB']();
    const db = await openDatabase();
    const objectStore = db.transaction(collection).objectStore(collection);
    const indexes: { [name: string]: string | string[] } = {};
    for (const name of Array.from(objectStore.indexNames)) {
      indexes[name] = objectStore.index(name).keyPath;
    }
    db.close();
    return indexes;
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
