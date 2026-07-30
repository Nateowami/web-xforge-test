import { IndexeddbOfflineStore } from './indexeddb-offline-store';
import { OfflineData } from './offline-store';
import { TypeRegistry } from './type-registry';

const COLLECTION = 'test_docs';

class TestDoc {
  static readonly COLLECTION = COLLECTION;
  static readonly INDEX_PATHS = [];
}

function databaseExists(): Promise<boolean> {
  return window.indexedDB.databases().then(databases => databases.some(database => database.name === 'xforge'));
}

describe('IndexeddbOfflineStore', () => {
  let store: IndexeddbOfflineStore;

  beforeEach(async () => {
    store = new IndexeddbOfflineStore(new TypeRegistry([TestDoc as any], [], []));
    await store.deleteDB();
  });

  afterEach(async () => {
    await store.deleteDB();
  });

  it('stores and retrieves data', async () => {
    await store.put(COLLECTION, { id: 'doc01' } as OfflineData);
    expect(await store.get(COLLECTION, 'doc01')).toEqual({ id: 'doc01' } as OfflineData);
  });

  it('does not fail when a put is started while the database is being deleted', async () => {
    await store.put(COLLECTION, { id: 'doc01' } as OfflineData);

    // The database connection is closed as part of the delete, so a put that starts at this point used to throw
    // "the database connection is closing", which surfaced to the user as an error dialog when logging out.
    const deletePromise = store.deleteDB();
    const putPromise = store.put(COLLECTION, { id: 'doc02' } as OfflineData);
    await deletePromise;
    await expectAsync(putPromise).toBeResolved();
  });

  it('is usable again after the database is deleted', async () => {
    await store.put(COLLECTION, { id: 'doc01' } as OfflineData);
    await store.deleteDB();

    await store.put(COLLECTION, { id: 'doc02' } as OfflineData);
    expect(await store.get(COLLECTION, 'doc01')).toBeUndefined();
    expect(await store.get(COLLECTION, 'doc02')).toEqual({ id: 'doc02' } as OfflineData);
  });

  it('does not recreate the database when further use is prevented', async () => {
    await store.put(COLLECTION, { id: 'doc01' } as OfflineData);
    await store.deleteDB(true);
    expect(await databaseExists()).toBe(false);

    // Saves that happen after logging out must not restore the database with the previous user's data
    await expectAsync(store.put(COLLECTION, { id: 'doc02' } as OfflineData)).toBeResolved();
    expect(await store.get(COLLECTION, 'doc02')).toBeUndefined();
    expect(await store.getAll(COLLECTION)).toEqual([]);
    expect(await store.getAllIds(COLLECTION)).toEqual([]);
    expect(await databaseExists()).toBe(false);
  });
});
