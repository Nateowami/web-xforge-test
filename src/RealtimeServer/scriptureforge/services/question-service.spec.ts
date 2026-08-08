import ShareDB from 'sharedb';
import ShareDBMingo from 'sharedb-mingo-memory';
import { instance, mock } from 'ts-mockito';
import { User, USERS_COLLECTION } from '../../common/models/user';
import { createTestUser } from '../../common/models/user-test-data';
import { RealtimeServer } from '../../common/realtime-server';
import { SchemaVersionRepository } from '../../common/schema-version-repository';
import { docSubmitJson0Op } from '../../common/utils/sharedb-utils';
import {
  allowAll,
  clientConnect,
  createDoc,
  fetchDoc,
  flushPromises,
  submitJson0Op
} from '../../common/utils/test-utils';
import { getQuestionDocId, Question, QUESTIONS_COLLECTION } from '../models/question';
import { SF_PROJECTS_COLLECTION, SFProject } from '../models/sf-project';
import { SFProjectRole } from '../models/sf-project-role';
import { createTestProject } from '../models/sf-project-test-data';
import {
  getSFProjectUserConfigDocId,
  SF_PROJECT_USER_CONFIGS_COLLECTION,
  SFProjectUserConfig
} from '../models/sf-project-user-config';
import { createTestProjectUserConfig } from '../models/sf-project-user-config-test-data';
import { QuestionService } from './question-service';

// user ids of users that like answers; the likes schema requires hexadecimal user ids
const LIKER1 = 'aaaaaaaaaaaaaaaaaaaaaa01';
const LIKER2 = 'bbbbbbbbbbbbbbbbbbbbbb02';

describe('QuestionService', () => {
  it('removes read refs when answer deleted', async () => {
    const env = new TestEnvironment();
    await env.createData();

    const conn = clientConnect(env.server, 'projectAdmin');
    await submitJson0Op<Question>(conn, QUESTIONS_COLLECTION, getQuestionDocId('project01', 'question01'), ops =>
      ops.remove(q => q.answers, 0)
    );
    await flushPromises();

    const adminProjectUserConfig = env.db.docs[SF_PROJECT_USER_CONFIGS_COLLECTION][
      getSFProjectUserConfigDocId('project01', 'projectAdmin')
    ].data as SFProjectUserConfig;
    expect(adminProjectUserConfig.answerRefsRead).not.toContain('answer01');
    expect(adminProjectUserConfig.commentRefsRead).not.toContain('comment01');
    const checkerProjectUserConfig = env.db.docs[SF_PROJECT_USER_CONFIGS_COLLECTION][
      getSFProjectUserConfigDocId('project01', 'checker')
    ].data as SFProjectUserConfig;
    expect(checkerProjectUserConfig.answerRefsRead).not.toContain('answer01');
    expect(checkerProjectUserConfig.commentRefsRead).not.toContain('comment01');
  });

  it('removes read refs when comment deleted', async () => {
    const env = new TestEnvironment();
    await env.createData();

    const conn = clientConnect(env.server, 'projectAdmin');
    await submitJson0Op<Question>(conn, QUESTIONS_COLLECTION, getQuestionDocId('project01', 'question01'), ops =>
      ops.remove(q => q.answers[0].comments, 0)
    );
    await flushPromises();

    const adminProjectUserConfig = env.db.docs[SF_PROJECT_USER_CONFIGS_COLLECTION][
      getSFProjectUserConfigDocId('project01', 'projectAdmin')
    ].data as SFProjectUserConfig;
    expect(adminProjectUserConfig.answerRefsRead).toContain('answer01');
    expect(adminProjectUserConfig.commentRefsRead).not.toContain('comment01');
    const checkerProjectUserConfig = env.db.docs[SF_PROJECT_USER_CONFIGS_COLLECTION][
      getSFProjectUserConfigDocId('project01', 'checker')
    ].data as SFProjectUserConfig;
    expect(checkerProjectUserConfig.answerRefsRead).toContain('answer01');
    expect(checkerProjectUserConfig.commentRefsRead).not.toContain('comment01');
  });

  it('removes duplicate like when the same user likes an answer from two clients', async () => {
    const env = new TestEnvironment();
    await env.createData();

    // both clients see the answer without any likes, as they would if they had been offline
    const doc1 = await fetchDoc(clientConnect(env.server, LIKER1), QUESTIONS_COLLECTION, env.questionDocId);
    const doc2 = await fetchDoc(clientConnect(env.server, LIKER1), QUESTIONS_COLLECTION, env.questionDocId);

    await docSubmitJson0Op<Question>(doc1, ops => ops.insert(q => q.answers[0].likes, 0, { ownerRef: LIKER1 }));
    await docSubmitJson0Op<Question>(doc2, ops => ops.insert(q => q.answers[0].likes, 0, { ownerRef: LIKER1 }));
    await flushPromises();

    expect(env.getQuestion().answers[0].likes).toEqual([{ ownerRef: LIKER1 }]);
  });

  it('keeps likes from different users', async () => {
    const env = new TestEnvironment();
    await env.createData();

    const doc1 = await fetchDoc(clientConnect(env.server, LIKER1), QUESTIONS_COLLECTION, env.questionDocId);
    const doc2 = await fetchDoc(clientConnect(env.server, LIKER2), QUESTIONS_COLLECTION, env.questionDocId);

    await docSubmitJson0Op<Question>(doc1, ops => ops.insert(q => q.answers[0].likes, 0, { ownerRef: LIKER1 }));
    await docSubmitJson0Op<Question>(doc2, ops => ops.insert(q => q.answers[0].likes, 0, { ownerRef: LIKER2 }));
    await flushPromises();

    expect(env.getQuestion().answers[0].likes).toEqual([{ ownerRef: LIKER2 }, { ownerRef: LIKER1 }]);
  });
});

class TestEnvironment {
  readonly service: QuestionService;
  readonly server: RealtimeServer;
  readonly db: ShareDBMingo;
  readonly mockedSchemaVersionRepository = mock(SchemaVersionRepository);

  constructor() {
    this.service = new QuestionService();
    const ShareDBMingoType = ShareDBMingo.extendMemoryDB(ShareDB.MemoryDB);
    this.db = new ShareDBMingoType();
    this.server = new RealtimeServer(
      'TEST',
      false,
      false,
      [this.service],
      SF_PROJECTS_COLLECTION,
      this.db,
      instance(this.mockedSchemaVersionRepository)
    );
    allowAll(this.server, USERS_COLLECTION);
    allowAll(this.server, SF_PROJECTS_COLLECTION);
    allowAll(this.server, SF_PROJECT_USER_CONFIGS_COLLECTION);
  }

  get questionDocId(): string {
    return getQuestionDocId('project01', 'question01');
  }

  getQuestion(): Question {
    return this.db.docs[QUESTIONS_COLLECTION][this.questionDocId].data as Question;
  }

  async createData(): Promise<void> {
    const conn = this.server.connect();
    await createDoc<User>(conn, USERS_COLLECTION, 'projectAdmin', createTestUser({}, 1));

    await createDoc<SFProjectUserConfig>(
      conn,
      SF_PROJECT_USER_CONFIGS_COLLECTION,
      getSFProjectUserConfigDocId('project01', 'projectAdmin'),
      createTestProjectUserConfig({
        projectRef: 'project01',
        ownerRef: 'projectAdmin',
        questionRefsRead: ['question01'],
        answerRefsRead: ['answer01'],
        commentRefsRead: ['comment01']
      })
    );

    await createDoc<User>(conn, USERS_COLLECTION, 'checker', createTestUser({}, 2));

    await createDoc<SFProjectUserConfig>(
      conn,
      SF_PROJECT_USER_CONFIGS_COLLECTION,
      getSFProjectUserConfigDocId('project01', 'checker'),
      createTestProjectUserConfig({
        projectRef: 'project01',
        ownerRef: 'checker',
        questionRefsRead: ['question01'],
        answerRefsRead: ['answer01'],
        commentRefsRead: ['comment01']
      })
    );

    await createDoc<SFProject>(
      conn,
      SF_PROJECTS_COLLECTION,
      'project01',
      createTestProject({
        userRoles: {
          projectAdmin: SFProjectRole.ParatextAdministrator,
          checker: SFProjectRole.CommunityChecker,
          [LIKER1]: SFProjectRole.CommunityChecker,
          [LIKER2]: SFProjectRole.CommunityChecker
        },
        paratextUsers: [{ sfUserId: 'projectAdmin', username: 'ptprojectAdmin', opaqueUserId: 'opaqueprojectAdmin' }]
      })
    );

    await createDoc<Question>(conn, QUESTIONS_COLLECTION, getQuestionDocId('project01', 'question01'), {
      dataId: 'question01',
      projectRef: 'project01',
      ownerRef: 'projectAdmin',
      verseRef: {
        bookNum: 40,
        chapterNum: 1,
        verseNum: 1
      },
      text: 'Question?',
      isArchived: false,
      dateModified: '',
      dateCreated: '',
      answers: [
        {
          dataId: 'answer01',
          ownerRef: 'checker',
          text: 'Answer.',
          dateModified: '',
          dateCreated: '',
          deleted: false,
          likes: [],
          comments: [
            {
              dataId: 'comment01',
              ownerRef: 'projectAdmin',
              text: 'Comment.',
              dateModified: '',
              dateCreated: '',
              deleted: false
            }
          ]
        }
      ]
    });
  }
}
