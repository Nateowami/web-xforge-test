'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const sharedb_1 = __importDefault(require('sharedb'));
const sharedb_mingo_memory_1 = __importDefault(require('sharedb-mingo-memory'));
const ts_mockito_1 = require('ts-mockito');
const user_1 = require('../../common/models/user');
const user_test_data_1 = require('../../common/models/user-test-data');
const realtime_server_1 = require('../../common/realtime-server');
const schema_version_repository_1 = require('../../common/schema-version-repository');
const test_utils_1 = require('../../common/utils/test-utils');
const question_1 = require('../models/question');
const sf_project_1 = require('../models/sf-project');
const sf_project_role_1 = require('../models/sf-project-role');
const sf_project_test_data_1 = require('../models/sf-project-test-data');
const sf_project_user_config_1 = require('../models/sf-project-user-config');
const sf_project_user_config_test_data_1 = require('../models/sf-project-user-config-test-data');
const question_service_1 = require('./question-service');
describe('QuestionService', () => {
  it('removes read refs when answer deleted', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'projectAdmin');
      yield (0, test_utils_1.submitJson0Op)(
        conn,
        question_1.QUESTIONS_COLLECTION,
        (0, question_1.getQuestionDocId)('project01', 'question01'),
        ops => ops.remove(q => q.answers, 0)
      );
      yield (0, test_utils_1.flushPromises)();
      const adminProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', 'projectAdmin')
        ].data;
      expect(adminProjectUserConfig.answerRefsRead).not.toContain('answer01');
      expect(adminProjectUserConfig.commentRefsRead).not.toContain('comment01');
      const checkerProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', 'checker')
        ].data;
      expect(checkerProjectUserConfig.answerRefsRead).not.toContain('answer01');
      expect(checkerProjectUserConfig.commentRefsRead).not.toContain('comment01');
    }));
  it('removes read refs when comment deleted', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'projectAdmin');
      yield (0, test_utils_1.submitJson0Op)(
        conn,
        question_1.QUESTIONS_COLLECTION,
        (0, question_1.getQuestionDocId)('project01', 'question01'),
        ops => ops.remove(q => q.answers[0].comments, 0)
      );
      yield (0, test_utils_1.flushPromises)();
      const adminProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', 'projectAdmin')
        ].data;
      expect(adminProjectUserConfig.answerRefsRead).toContain('answer01');
      expect(adminProjectUserConfig.commentRefsRead).not.toContain('comment01');
      const checkerProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', 'checker')
        ].data;
      expect(checkerProjectUserConfig.answerRefsRead).toContain('answer01');
      expect(checkerProjectUserConfig.commentRefsRead).not.toContain('comment01');
    }));
});
class TestEnvironment {
  constructor() {
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.service = new question_service_1.QuestionService();
    const ShareDBMingoType = sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB);
    this.db = new ShareDBMingoType();
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      false,
      [this.service],
      sf_project_1.SF_PROJECTS_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
    (0, test_utils_1.allowAll)(this.server, user_1.USERS_COLLECTION);
    (0, test_utils_1.allowAll)(this.server, sf_project_1.SF_PROJECTS_COLLECTION);
    (0, test_utils_1.allowAll)(this.server, sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION);
  }
  createData() {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'projectAdmin',
        (0, user_test_data_1.createTestUser)({}, 1)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', 'projectAdmin'),
        (0, sf_project_user_config_test_data_1.createTestProjectUserConfig)({
          projectRef: 'project01',
          ownerRef: 'projectAdmin',
          questionRefsRead: ['question01'],
          answerRefsRead: ['answer01'],
          commentRefsRead: ['comment01']
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'checker',
        (0, user_test_data_1.createTestUser)({}, 2)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', 'checker'),
        (0, sf_project_user_config_test_data_1.createTestProjectUserConfig)({
          projectRef: 'project01',
          ownerRef: 'checker',
          questionRefsRead: ['question01'],
          answerRefsRead: ['answer01'],
          commentRefsRead: ['comment01']
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_1.SF_PROJECTS_COLLECTION,
        'project01',
        (0, sf_project_test_data_1.createTestProject)({
          userRoles: {
            projectAdmin: sf_project_role_1.SFProjectRole.ParatextAdministrator,
            checker: sf_project_role_1.SFProjectRole.CommunityChecker
          },
          paratextUsers: [{ sfUserId: 'projectAdmin', username: 'ptprojectAdmin', opaqueUserId: 'opaqueprojectAdmin' }]
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        question_1.QUESTIONS_COLLECTION,
        (0, question_1.getQuestionDocId)('project01', 'question01'),
        {
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
        }
      );
    });
  }
}
//# sourceMappingURL=question-service.spec.js.map
