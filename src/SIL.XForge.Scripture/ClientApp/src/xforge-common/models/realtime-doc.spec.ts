import { TestBed } from '@angular/core/testing';
import { VerseRef } from '@sillsdev/scripture';
import * as OTJson0 from 'ot-json0';
import { Question, QUESTIONS_COLLECTION } from 'realtime-server/lib/esm/scriptureforge/models/question';
import { fromVerseRef } from 'realtime-server/lib/esm/scriptureforge/models/verse-ref-data';
import { QuestionDoc } from '../../app/core/models/question-doc';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { MemoryOfflineStore } from '../memory-offline-store';
import { MemoryRealtimeDocAdapter } from '../memory-realtime-remote-store';
import { provideTestRealtime } from '../test-realtime-providers';
import { TestRealtimeService } from '../test-realtime.service';
import { configureTestingModule } from '../test-utils';
import { RealtimeOfflineData } from './realtime-offline-data';

const DOC_ID = 'project01:question01';

describe('RealtimeDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  it('does not create a doc that is already loaded when the offline data has no version', async () => {
    const env = new TestEnvironment();
    // The doc exists on the server, so it is loaded when the doc is subscribed to.
    env.addRemoteQuestion('created in another tab');
    // Another tab has just created the doc, and stores it without a version until its create op is acknowledged.
    env.addOfflineQuestion(undefined, 'created in another tab');

    const doc = env.realtimeService.get<QuestionDoc>(QUESTIONS_COLLECTION, DOC_ID);
    const createSpy = spyOn(doc.adapter, 'create').and.callThrough();
    await doc.subscribe();
    await env.flush();

    expect(createSpy).not.toHaveBeenCalled();
    expect(doc.data!.text).toEqual('created in another tab');
    // the stale offline data is replaced with the current state of the doc
    expect(env.getOfflineQuestion()!.v).toEqual(1);
  });

  it('creates a doc that is not loaded when the offline data has no version', async () => {
    const env = new TestEnvironment();
    // The doc was created while offline, so it only exists in the offline store.
    env.addOfflineQuestion(undefined, 'created while offline');

    const adapter = new MemoryRealtimeDocAdapter(QUESTIONS_COLLECTION, DOC_ID);
    // a doc that has not been created has no type, but the memory adapter defaults to one
    adapter.type = undefined;
    const doc = new QuestionDoc(env.realtimeService, adapter);
    const createSpy = spyOn(doc.adapter, 'create').and.callThrough();
    await doc.subscribe();
    await env.flush();

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(doc.data!.text).toEqual('created while offline');
  });

  it('ingests the offline data when it has a version', async () => {
    const env = new TestEnvironment();
    env.addRemoteQuestion('on the server');
    env.addOfflineQuestion(1, 'on the server');

    const doc = env.realtimeService.get<QuestionDoc>(QUESTIONS_COLLECTION, DOC_ID);
    const createSpy = spyOn(doc.adapter, 'create').and.callThrough();
    const ingestSpy = spyOn(doc.adapter, 'ingestSnapshot').and.callThrough();
    await doc.subscribe();
    await env.flush();

    expect(createSpy).not.toHaveBeenCalled();
    expect(ingestSpy).toHaveBeenCalledTimes(1);
  });
});

class TestEnvironment {
  readonly realtimeService: TestRealtimeService = TestBed.inject(TestRealtimeService);

  addRemoteQuestion(text: string): void {
    this.realtimeService.addSnapshot<Question>(QUESTIONS_COLLECTION, {
      id: DOC_ID,
      data: createQuestion(text),
      v: 1
    });
  }

  addOfflineQuestion(version: number | undefined, text: string): void {
    (this.realtimeService.offlineStore as MemoryOfflineStore).addData(QUESTIONS_COLLECTION, {
      id: DOC_ID,
      v: version,
      data: createQuestion(text),
      type: OTJson0.type.name,
      pendingOps: []
    } as RealtimeOfflineData);
  }

  getOfflineQuestion(): RealtimeOfflineData | undefined {
    return (this.realtimeService.offlineStore as MemoryOfflineStore).getData<RealtimeOfflineData>(
      QUESTIONS_COLLECTION,
      DOC_ID
    );
  }

  /** Allows the offline store updates that are not awaited by the doc to complete. */
  async flush(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve));
  }
}

function createQuestion(text: string): Question {
  const date = new Date().toJSON();
  return {
    dataId: 'question01',
    projectRef: 'project01',
    ownerRef: 'user01',
    text,
    verseRef: fromVerseRef(new VerseRef('MAT 1:3')),
    answers: [],
    isArchived: false,
    dateCreated: date,
    dateModified: date
  };
}
