import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { cloneDeep } from 'lodash-es';
import * as OTJson0 from 'ot-json0';
import {
  getQuestionDocId,
  Question,
  QUESTIONS_COLLECTION
} from 'realtime-server/lib/esm/scriptureforge/models/question';
import { QuestionDoc } from '../../app/core/models/question-doc';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { MemoryRealtimeDocAdapter } from '../memory-realtime-remote-store';
import { noopDestroyRef } from '../realtime.service';
import { provideTestRealtime } from '../test-realtime-providers';
import { TestRealtimeService } from '../test-realtime.service';
import { configureTestingModule } from '../test-utils';
import { RealtimeOfflineData } from './realtime-offline-data';
import { RealtimeQuery } from './realtime-query';

const PROJECT_ID = 'project01';

describe('RealtimeQuery', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  it('local update drops a doc that no longer matches the query in the offline store', fakeAsync(() => {
    const env = new TestEnvironment();
    const query = env.subscribeToActiveQuestions();
    expect(env.docIds(query)).toEqual([env.docId('q1'), env.docId('q2')]);

    env.archiveInOfflineStore('q1');
    env.localUpdate(query);

    expect(env.docIds(query)).toEqual([env.docId('q2')]);
  }));

  it('local update does not restore a doc that no longer matches the query in memory', fakeAsync(() => {
    const env = new TestEnvironment();
    const query = env.subscribeToActiveQuestions();
    expect(env.docIds(query)).toEqual([env.docId('q1'), env.docId('q2')]);

    // A remote change archives the question. The doc in memory is up-to-date, but the snapshot in the offline store
    // is not, because it is written asynchronously.
    env.archiveInMemory('q1');
    env.localUpdate(query);

    expect(env.docIds(query)).toEqual([env.docId('q2')]);
  }));

  it('local update includes docs that are not loaded in memory', fakeAsync(() => {
    const env = new TestEnvironment();
    const query = env.subscribeToActiveQuestions();

    env.addToOfflineStore('q3');
    env.localUpdate(query);

    expect(env.docIds(query)).toEqual([env.docId('q1'), env.docId('q2'), env.docId('q3')]);
  }));
});

class TestEnvironment {
  readonly realtimeService: TestRealtimeService = TestBed.inject<TestRealtimeService>(TestRealtimeService);

  constructor() {
    for (const dataId of ['q1', 'q2']) {
      this.realtimeService.addSnapshot<Question>(QUESTIONS_COLLECTION, {
        id: this.docId(dataId),
        data: this.createQuestion(dataId)
      });
      this.addToOfflineStore(dataId);
    }
  }

  docId(dataId: string): string {
    return getQuestionDocId(PROJECT_ID, dataId);
  }

  docIds(query: RealtimeQuery<QuestionDoc>): string[] {
    return query.docs.map(d => d.id);
  }

  subscribeToActiveQuestions(): RealtimeQuery<QuestionDoc> {
    let query: RealtimeQuery<QuestionDoc> | undefined;
    void this.realtimeService
      .subscribeQuery<QuestionDoc>(QUESTIONS_COLLECTION, { projectRef: PROJECT_ID, isArchived: false }, noopDestroyRef)
      .then(q => (query = q));
    tick();
    return query!;
  }

  localUpdate(query: RealtimeQuery<QuestionDoc>): void {
    void query.localUpdate();
    tick();
  }

  /** Stores a snapshot of the question in the offline store, independent of the doc in memory. */
  addToOfflineStore(dataId: string, question: Question = this.createQuestion(dataId)): void {
    const offlineData: RealtimeOfflineData = {
      id: this.docId(dataId),
      v: 1,
      data: cloneDeep(question),
      type: OTJson0.type.name,
      pendingOps: []
    };
    void this.realtimeService.offlineStore.put(QUESTIONS_COLLECTION, offlineData);
    tick();
  }

  /** Archives the question in the offline store, as happens when the change originates on this client. */
  archiveInOfflineStore(dataId: string): void {
    this.addToOfflineStore(dataId, { ...this.createQuestion(dataId), isArchived: true });
  }

  /** Archives the question in the doc in memory only, leaving the snapshot in the offline store out-of-date. */
  archiveInMemory(dataId: string): void {
    const doc = this.realtimeService.get<QuestionDoc>(QUESTIONS_COLLECTION, this.docId(dataId));
    // submit as a local change, so that the doc does not write the change to the offline store
    void (doc.adapter as MemoryRealtimeDocAdapter).submitOp([{ p: ['isArchived'], od: false, oi: true }], true);
    tick();
  }

  private createQuestion(dataId: string): Question {
    return {
      dataId,
      projectRef: PROJECT_ID,
      ownerRef: 'user01',
      verseRef: { bookNum: 40, chapterNum: 1, verseNum: 1 },
      text: dataId,
      answers: [],
      isArchived: false,
      dateCreated: '',
      dateModified: ''
    };
  }
}
