import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import * as OTJson0 from 'ot-json0';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { MemoryRealtimeDocAdapter } from '../memory-realtime-remote-store';
import { provideTestRealtime } from '../test-realtime-providers';
import { TestRealtimeService } from '../test-realtime.service';
import { configureTestingModule } from '../test-utils';
import { RealtimeDoc } from './realtime-doc';
import { RealtimeOfflineData } from './realtime-offline-data';
import { RealtimeQuery } from './realtime-query';

const COLLECTION = 'questions';
const QUESTION_ID = 'question01';
const QUESTION = { projectRef: 'project01', text: 'created in another tab' };

describe('RealtimeDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  let service: TestRealtimeService;
  let query: RealtimeQuery | undefined;
  let ngZone: NgZone;
  // Errors that reach Angular's error handler, which shows them in the "An error has occurred" dialog
  let reportedErrors: unknown[];
  let errorSub: Subscription;

  beforeEach(async () => {
    service = TestBed.inject(TestRealtimeService);
    ngZone = TestBed.inject(NgZone);
    reportedErrors = [];
    errorSub = ngZone.onError.subscribe(error => reportedErrors.push(error));
    // Stored the way a tab stores a doc it created, before the server acknowledges the create
    await service.offlineStore.put(COLLECTION, {
      id: QUESTION_ID,
      v: undefined,
      data: QUESTION,
      type: OTJson0.type.name,
      pendingOps: []
    } as RealtimeOfflineData);
  });

  afterEach(() => {
    query?.dispose();
    query = undefined;
    errorSub.unsubscribe();
  });

  /** Gets the doc without any data, as it is before the server has sent it. */
  function getUnloadedDoc(): RealtimeDoc {
    const doc = service.get<RealtimeDoc>(COLLECTION, QUESTION_ID);
    (doc.adapter as MemoryRealtimeDocAdapter).type = undefined;
    return doc;
  }

  /**
   * Makes creates fail the way ShareDB fails them when the doc already exists on the server: locally if the doc already
   * has the server's data, otherwise by the server, after which ShareDB has fetched the server's snapshot.
   */
  function rejectCreatesAsAlreadyCreated(): jasmine.Spy {
    return spyOn(MemoryRealtimeDocAdapter.prototype, 'create').and.callFake(function (this: MemoryRealtimeDocAdapter) {
      let message = 'Document already exists';
      if (this.type == null) {
        this.data = QUESTION;
        this.type = OTJson0.type;
        this.version = 1;
        message = 'Invalid op submitted. Document already created';
      }
      return Promise.reject(Object.assign(new Error(message), { code: 'ERR_DOC_ALREADY_CREATED' }));
    });
  }

  async function subscribeQuery(): Promise<void> {
    query = service.createQuery(COLLECTION, { projectRef: 'project01' });
    await ngZone.run(() => query!.subscribe());
    // Let the create that the doc submits from the offline store settle
    await new Promise(resolve => setTimeout(resolve));
  }

  it('accepts the server copy when another tab already created a doc that a query reads offline first', async () => {
    const doc = getUnloadedDoc();
    service.addSnapshot(COLLECTION, { id: QUESTION_ID, data: QUESTION, v: 1 });
    const createSpy = rejectCreatesAsAlreadyCreated();

    await subscribeQuery();

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(reportedErrors).toEqual([]);
    expect(query!.docs).toEqual([doc]);
    expect(doc.data).toEqual(QUESTION);
    const stored = await service.offlineStore.get<RealtimeOfflineData>(COLLECTION, QUESTION_ID);
    expect(stored?.v).toEqual(1);
  });

  it('accepts the server copy when the doc was received from the server before the offline record was read', async () => {
    service.addSnapshot(COLLECTION, { id: QUESTION_ID, data: QUESTION, v: 1 });
    const doc = service.get<RealtimeDoc>(COLLECTION, QUESTION_ID);
    const createSpy = rejectCreatesAsAlreadyCreated();

    await subscribeQuery();

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(reportedErrors).toEqual([]);
    expect(doc.data).toEqual(QUESTION);
    const stored = await service.offlineStore.get<RealtimeOfflineData>(COLLECTION, QUESTION_ID);
    expect(stored?.v).toEqual(1);
  });

  it('creates a doc from a create that was stored offline and never sent', async () => {
    const doc = getUnloadedDoc();
    const createSpy = spyOn(doc.adapter, 'create').and.callThrough();

    await subscribeQuery();

    expect(createSpy).toHaveBeenCalledOnceWith(QUESTION, OTJson0.type.name);
    expect(reportedErrors).toEqual([]);
    const stored = await service.offlineStore.get<RealtimeOfflineData>(COLLECTION, QUESTION_ID);
    expect(stored?.v).toEqual(0);
  });

  it('still reports other errors from creating a doc that was stored offline', async () => {
    const doc = getUnloadedDoc();
    const error = Object.assign(new Error('Permission denied'), { code: 'ERR_APPLY_FAILED' });
    spyOn(doc.adapter, 'create').and.rejectWith(error);

    await subscribeQuery();

    expect(reportedErrors).toEqual([error]);
  });
});
