import { TestBed } from '@angular/core/testing';
import { configureTestingModule } from 'xforge-common/test-utils';
import { MemoryOfflineStore } from '../memory-offline-store';
import { MemoryRealtimeDocAdapter } from '../memory-realtime-remote-store';
import { provideTestRealtime } from '../test-realtime-providers';
import { TestRealtimeService } from '../test-realtime.service';
import { TypeRegistry } from '../type-registry';
import { JsonRealtimeDoc } from './json-realtime-doc';

const COLLECTION = 'test_docs';
const DOC_ID = 'doc01';

class TestDoc extends JsonRealtimeDoc<{ name: string }> {
  static readonly COLLECTION = COLLECTION;
  static readonly INDEX_PATHS: string[] = [];
}

/** Mimics ShareDB: the doc is created locally right away, but the server can reject it later. */
class RejectableDocAdapter extends MemoryRealtimeDocAdapter {
  private reject!: (reason: any) => void;
  private readonly serverResponse = new Promise<void>((_resolve, reject) => (this.reject = reject));

  override create(data: any, type?: string): Promise<void> {
    void super.create(data, type);
    return this.serverResponse;
  }

  /** Rejects the create the way the realtime server does, rolling the doc back locally. */
  async rejectCreate(): Promise<void> {
    this.data = undefined;
    this.type = undefined;
    this.version = -1;
    this.reject(new Error('403: Permission denied (create)'));
    await this.serverResponse.catch(() => {});
    // let the doc's rejection handler run
    await new Promise(resolve => setTimeout(resolve));
  }
}

describe('RealtimeDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(new TypeRegistry([TestDoc], [], []))]
  }));

  it('discards the local copy of a doc that the server refuses to create', async () => {
    const realtimeService = TestBed.inject(TestRealtimeService);
    const offlineStore = realtimeService.offlineStore as MemoryOfflineStore;
    const adapter = new RejectableDocAdapter(COLLECTION, DOC_ID);
    const doc = new TestDoc(realtimeService, adapter);
    let deleted = false;
    doc.delete$.subscribe(() => (deleted = true));

    // the create resolves without waiting for the server, so that creating while offline works
    await doc.create({ name: 'a note' });
    expect(offlineStore.getData(COLLECTION, DOC_ID)).toBeDefined();

    // the rejection is deliberately rethrown so that the user is told the change was not saved, so the browser logs
    // an uncaught "403: Permission denied (create)" while this runs
    await adapter.rejectCreate();

    expect(offlineStore.getData(COLLECTION, DOC_ID)).toBeUndefined();
    expect(deleted).toBe(true);
  });
});
