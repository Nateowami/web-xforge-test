import { TestBed } from '@angular/core/testing';
import * as OTJson0 from 'ot-json0';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { MemoryRealtimeDocAdapter } from '../memory-realtime-remote-store';
import { provideTestRealtime } from '../test-realtime-providers';
import { TestRealtimeService } from '../test-realtime.service';
import { configureTestingModule } from '../test-utils';
import { RealtimeDoc } from './realtime-doc';
import { RealtimeOfflineData } from './realtime-offline-data';

const COLLECTION = 'questions';

describe('RealtimeDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  let service: TestRealtimeService;

  beforeEach(() => {
    service = TestBed.inject(TestRealtimeService);
  });

  /** Stores a doc the way a tab does after creating it but before the server acknowledges the create. */
  async function storeUnacknowledgedCreate(id: string): Promise<void> {
    const offlineData: RealtimeOfflineData = {
      id,
      v: undefined,
      data: { text: 'created in another tab' },
      type: OTJson0.type.name,
      pendingOps: []
    };
    await service.offlineStore.put(COLLECTION, offlineData);
  }

  it('does not create a doc again when it was already received from the server', async () => {
    service.addSnapshot(COLLECTION, { id: 'question01', data: { text: 'created in another tab' }, v: 1 });
    await storeUnacknowledgedCreate('question01');
    const doc = service.get<RealtimeDoc>(COLLECTION, 'question01');
    const createSpy = spyOn(doc.adapter, 'create').and.callThrough();

    await doc.onAddedToSubscribeQuery();

    expect(createSpy).not.toHaveBeenCalled();
    expect(doc.data).toEqual({ text: 'created in another tab' });
    const stored = await service.offlineStore.get<RealtimeOfflineData>(COLLECTION, 'question01');
    expect(stored?.v).toEqual(1);
  });

  it('creates a doc from an unacknowledged offline create when the doc is not loaded', async () => {
    await storeUnacknowledgedCreate('question01');
    const doc = service.get<RealtimeDoc>(COLLECTION, 'question01');
    (doc.adapter as MemoryRealtimeDocAdapter).type = undefined;
    const createSpy = spyOn(doc.adapter, 'create').and.callThrough();

    await doc.onAddedToSubscribeQuery();

    expect(createSpy).toHaveBeenCalledOnceWith({ text: 'created in another tab' }, OTJson0.type.name);
  });
});
