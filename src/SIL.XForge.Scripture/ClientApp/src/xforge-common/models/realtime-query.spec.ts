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
import { MemoryOfflineStore } from '../memory-offline-store';
import { MemoryRealtimeDocAdapter } from '../memory-realtime-remote-store';
import { noopDestroyRef } from '../realtime.service';
import { provideTestRealtime } from '../test-realtime-providers';
import { TestRealtimeService } from '../test-realtime.service';
import { configureTestingModule } from '../test-utils';
import { RealtimeOfflineData } from './realtime-offline-data';
import { RealtimeQuery } from './realtime-query';

const PROJECT_ID = 'project01';
const ARCHIVE_OP = [{ p: ['isArchived'], od: false, oi: true }];

describe('RealtimeQuery', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  it('does not restore a doc removed by the server when its change arrives after the results change', fakeAsync(() => {
    const env = new TestEnvironment();
    const query = env.subscribeToActiveQuestions();
    expect(env.docIds(query)).toEqual([env.docId('q1'), env.docId('q2')]);

    // ShareDB sends the change to the results before the op that caused it
    let completeFetch: () => void = () => {};
    spyOn(env.adapter('q2'), 'fetch').and.returnValue(new Promise<void>(resolve => (completeFetch = resolve)));
    env.archiveOnServer('q2');
    expect(env.docIds(query)).toEqual([env.docId('q1')]);
    env.receiveRemoteOp('q2', ARCHIVE_OP);
    completeFetch();
    tick();

    env.answerLocally('q1');

    expect(env.docIds(query)).toEqual([env.docId('q1')]);
    expect(env.offlineQuestion('q2').isArchived).toBe(true);
  }));

  it('does not restore a doc removed by the server when its change was made while not listening', fakeAsync(() => {
    const env = new TestEnvironment();
    const query = env.subscribeToActiveQuestions();

    // The server never sends the op, since the doc was not subscribed when it was made, so only the fetch gets it
    spyOn(env.adapter('q2'), 'fetch').and.callFake(() => env.adapter('q2').submitOp(ARCHIVE_OP, false));
    env.archiveOnServer('q2');
    tick();

    env.answerLocally('q1');

    expect(env.docIds(query)).toEqual([env.docId('q1')]);
    expect(env.offlineQuestion('q2').isArchived).toBe(true);
  }));

  it('does not fetch docs that are removed when the query is disposed', fakeAsync(() => {
    const env = new TestEnvironment();
    const query = env.subscribeToActiveQuestions();
    const fetchSpy = spyOn(env.adapter('q1'), 'fetch').and.callThrough();

    query.dispose();
    tick();

    expect(fetchSpy).not.toHaveBeenCalled();
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
      // A separate copy, so that changes to the doc in memory do not change the offline store as well
      const offlineData: RealtimeOfflineData = {
        id: this.docId(dataId),
        v: 0,
        data: this.createQuestion(dataId),
        type: OTJson0.type.name,
        pendingOps: []
      };
      void this.realtimeService.offlineStore.put(QUESTIONS_COLLECTION, offlineData);
    }
    tick();
  }

  docId(dataId: string): string {
    return getQuestionDocId(PROJECT_ID, dataId);
  }

  docIds(query: RealtimeQuery<QuestionDoc>): string[] {
    return query.docs.map(d => d.id);
  }

  adapter(dataId: string): MemoryRealtimeDocAdapter {
    return this.realtimeService.get<QuestionDoc>(QUESTIONS_COLLECTION, this.docId(dataId))
      .adapter as MemoryRealtimeDocAdapter;
  }

  offlineQuestion(dataId: string): Question {
    const offlineStore = this.realtimeService.offlineStore as MemoryOfflineStore;
    return offlineStore.getData<RealtimeOfflineData>(QUESTIONS_COLLECTION, this.docId(dataId))!.data;
  }

  subscribeToActiveQuestions(): RealtimeQuery<QuestionDoc> {
    let query: RealtimeQuery<QuestionDoc> | undefined;
    void this.realtimeService
      .subscribeQuery<QuestionDoc>(QUESTIONS_COLLECTION, { projectRef: PROJECT_ID, isArchived: false }, noopDestroyRef)
      .then(q => (query = q));
    tick();
    return query!;
  }

  /** Archives the question on the server only, and updates the server's query results. */
  archiveOnServer(dataId: string): void {
    this.realtimeService.addSnapshot<Question>(QUESTIONS_COLLECTION, {
      id: this.docId(dataId),
      data: { ...this.createQuestion(dataId), isArchived: true },
      v: 1
    });
    this.realtimeService.updateQueryAdaptersRemote();
  }

  receiveRemoteOp(dataId: string, op: any): void {
    void this.adapter(dataId).submitOp(cloneDeep(op), false);
    tick();
  }

  answerLocally(dataId: string): void {
    const doc = this.realtimeService.get<QuestionDoc>(QUESTIONS_COLLECTION, this.docId(dataId));
    void doc.submitJson0Op(op =>
      op.add(q => q.answers, {
        dataId: 'a1',
        ownerRef: 'user02',
        text: 'answer',
        likes: [],
        comments: [],
        deleted: false,
        dateCreated: '',
        dateModified: ''
      })
    );
    tick();
  }

  private createQuestion(dataId: string): Question {
    return {
      dataId,
      projectRef: PROJECT_ID,
      ownerRef: 'user01',
      verseRef: { bookNum: 8, chapterNum: 1, verseNum: 1 },
      text: dataId,
      answers: [],
      isArchived: false,
      dateCreated: '',
      dateModified: ''
    };
  }
}
