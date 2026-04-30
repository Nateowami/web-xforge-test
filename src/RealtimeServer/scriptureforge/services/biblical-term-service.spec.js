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
const scripture_1 = require('@sillsdev/scripture');
const sharedb_1 = __importDefault(require('sharedb'));
const sharedb_mingo_memory_1 = __importDefault(require('sharedb-mingo-memory'));
const ts_mockito_1 = require('ts-mockito');
const user_1 = require('../../common/models/user');
const user_test_data_1 = require('../../common/models/user-test-data');
const realtime_server_1 = require('../../common/realtime-server');
const schema_version_repository_1 = require('../../common/schema-version-repository');
const test_utils_1 = require('../../common/utils/test-utils');
const biblical_term_1 = require('../models/biblical-term');
const sf_project_1 = require('../models/sf-project');
const sf_project_role_1 = require('../models/sf-project-role');
const sf_project_test_data_1 = require('../models/sf-project-test-data');
const sf_project_user_config_1 = require('../models/sf-project-user-config');
const sf_project_user_config_test_data_1 = require('../models/sf-project-user-config-test-data');
const biblical_term_service_1 = require('./biblical-term-service');
describe('BiblicalTermService', () => {
  it('the model builds an id as expected', () => {
    expect((0, biblical_term_1.getBiblicalTermDocId)('myProjectId', 'myDataId')).toEqual('myProjectId:myDataId');
  });
  it('allows user to read biblical term', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.projectAdminId);
      const doc = yield (0, test_utils_1.fetchDoc)(
        conn,
        biblical_term_1.BIBLICAL_TERM_COLLECTION,
        (0, biblical_term_1.getBiblicalTermDocId)('project01', 'biblicalTerm01')
      );
      expect(doc).not.toBeNull();
    }));
  it('allows user to edit biblical term', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.projectAdminId);
      const docId = (0, biblical_term_1.getBiblicalTermDocId)('project01', 'biblicalTerm01');
      const doc = yield (0, test_utils_1.fetchDoc)(conn, biblical_term_1.BIBLICAL_TERM_COLLECTION, docId);
      expect(doc).not.toBeNull();
      const content = 'edited content';
      yield (0, test_utils_1.submitJson0Op)(conn, biblical_term_1.BIBLICAL_TERM_COLLECTION, docId, op =>
        op.set(b => b.description, content.toString())
      );
      expect(doc.data.description).toEqual('edited content');
    }));
});
class TestEnvironment {
  constructor() {
    this.projectAdminId = 'projectAdmin';
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.service = new biblical_term_service_1.BiblicalTermService();
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
        this.projectAdminId,
        (0, user_test_data_1.createTestUser)()
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', this.projectAdminId),
        (0, sf_project_user_config_test_data_1.createTestProjectUserConfig)({
          projectRef: 'project01',
          ownerRef: this.projectAdminId,
          questionRefsRead: ['question01'],
          answerRefsRead: ['answer01'],
          commentRefsRead: ['comment01']
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_1.SF_PROJECTS_COLLECTION,
        'project01',
        (0, sf_project_test_data_1.createTestProjectProfile)({
          userRoles: {
            projectAdmin: sf_project_role_1.SFProjectRole.ParatextAdministrator,
            checker: sf_project_role_1.SFProjectRole.CommunityChecker,
            commenter: sf_project_role_1.SFProjectRole.Commenter
          }
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        biblical_term_1.BIBLICAL_TERM_COLLECTION,
        (0, biblical_term_1.getBiblicalTermDocId)('project01', 'biblicalTerm01'),
        {
          projectRef: 'project01',
          ownerRef: 'some-owner',
          dataId: 'biblicalTerm01',
          termId: 'δοῦλος-1',
          transliteration: 'doulos-1',
          renderings: ['bondservant', 'slave'],
          description: '',
          language: 'greek',
          links: ['realia:3.21.4'],
          references: [new scripture_1.VerseRef(40, 1, 1).BBBCCCVVV],
          definitions: {
            en: {
              categories: ['beings'],
              domains: ['people', 'authority', 'control', 'serve'],
              gloss: 'slave; servant',
              notes: 'one who is a slave in the sense of becoming the property of an owner'
            }
          }
        }
      );
    });
  }
}
//# sourceMappingURL=biblical-term-service.spec.js.map
