import { IndexeddbOfflineStore } from './indexeddb-offline-store';
import { TypeRegistry } from './type-registry';

const COLLECTION = 'test_collection';

describe('IndexeddbOfflineStore', () => {
  let store: IndexeddbOfflineStore;

  beforeEach(() => {
    store = new IndexeddbOfflineStore(new TypeRegistry([], [], [COLLECTION]));
  });

  afterEach(async () => {
    await store.deleteDB();
  });

  it('should put and retrieve an item', async () => {
    await store.put(COLLECTION, { id: 'item1' });
    const result = await store.get<{ id: string }>(COLLECTION, 'item1');
    expect(result?.id).toBe('item1');
  });

  it('should return all items', async () => {
    await store.put(COLLECTION, { id: 'item1' });
    await store.put(COLLECTION, { id: 'item2' });
    const results = await store.getAll(COLLECTION);
    expect(results.length).toBe(2);
  });

  it('should return all IDs', async () => {
    await store.put(COLLECTION, { id: 'item1' });
    await store.put(COLLECTION, { id: 'item2' });
    const ids = await store.getAllIds(COLLECTION);
    expect(ids).toContain('item1');
    expect(ids).toContain('item2');
  });

  it('should delete an item', async () => {
    await store.put(COLLECTION, { id: 'item1' });
    await store.delete(COLLECTION, 'item1');
    const result = await store.get<{ id: string }>(COLLECTION, 'item1');
    expect(result).toBeUndefined();
  });

  it('should not fail with "database connection is closing" when deleteDB and getAll are called in the same turn', async () => {
    // Ensure the DB is open before triggering the race.
    await store.put(COLLECTION, { id: 'item1' });

    // This reproduces "Failed to execute 'transaction' on 'IDBDatabase':
    // The database connection is closing."
    //
    // Root cause (before the fix):
    //   deleteDB() called the async closeDB(), which deferred db.close() to a microtask.
    //   Because deleteDB() registered its microtask continuation first, db.close() ran
    //   before getAll()'s db.transaction() — the connection was already closing when
    //   getAll() tried to use it.
    //
    // Fix: closeDB() is now synchronous. Any method that gets a stale DB reference from
    //   await openDB() detects it and retries with a fresh connection.
    const deletePromise = store.deleteDB();
    const getAllPromise = store.getAll(COLLECTION);

    await deletePromise;
    // After the fix, getAll() detects the stale connection and retries, returning an empty
    // array because the DB was deleted. Before the fix, this would reject with an
    // InvalidStateError: "The database connection is closing."
    await expectAsync(getAllPromise).toBeResolvedTo(jasmine.any(Array));
  });
});
