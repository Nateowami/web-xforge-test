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
const system_role_1 = require('../../common/models/system-role');
const realtime_server_1 = require('../../common/realtime-server');
const schema_version_repository_1 = require('../../common/schema-version-repository');
const test_utils_1 = require('../../common/utils/test-utils');
const sf_project_1 = require('../models/sf-project');
const sf_project_test_data_1 = require('../models/sf-project-test-data');
const sf_project_migrations_1 = require('./sf-project-migrations');
const sf_project_service_1 = require('./sf-project-service');
describe('SFProjectService', () => {
  it('allows user on project to see profile', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect(
        (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECT_PROFILES_COLLECTION, 'project01')
      ).resolves.not.toThrow();
    }));
  it('does not allow non-paratext user to see project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect((0, test_utils_1.fetchDoc)(conn, env.collection, 'project01')).rejects.toThrow();
    }));
  it('allows paratext user to see project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'translator');
      yield expect((0, test_utils_1.fetchDoc)(conn, env.collection, 'project01')).resolves.not.toThrow();
    }));
  it('allows system admin user to see project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      expect(env.paratextUsers.find(u => u.sfUserId === 'sys_admin')).toBeUndefined();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'sys_admin', system_role_1.SystemRole.SystemAdmin);
      yield expect((0, test_utils_1.fetchDoc)(conn, env.collection, 'project01')).resolves.not.toThrow();
    }));
  it('does not allow non-member to view profile', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'non_member');
      yield expect(
        (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECT_PROFILES_COLLECTION, 'project01')
      ).rejects.toThrow();
    }));
});
class TestEnvironment {
  constructor() {
    this.collection = sf_project_1.SF_PROJECTS_COLLECTION;
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.paratextUsers = [
      {
        sfUserId: 'projectAdmin',
        username: 'ptprojectAdmin',
        opaqueUserId: 'opaqueprojectAdmin',
        role: 'pt_administrator'
      },
      { sfUserId: 'translator', username: 'pttranslator', opaqueUserId: 'opaquetranslator', role: 'pt_translator' }
    ];
    this.service = new sf_project_service_1.SFProjectService(sf_project_migrations_1.SF_PROJECT_MIGRATIONS);
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
  }
  createData() {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_1.SF_PROJECTS_COLLECTION,
        'project01',
        (0, sf_project_test_data_1.createTestProject)({
          userRoles: {
            projectAdmin: 'pt_administrator',
            translator: 'pt_translator',
            observer: 'sf_observer'
          },
          paratextUsers: this.paratextUsers,
          texts: [
            {
              bookNum: 1,
              hasSource: false,
              chapters: [
                {
                  number: 1,
                  lastVerse: 3,
                  isValid: true,
                  permissions: {
                    projectAdmin: 'write',
                    translator: 'write'
                  }
                }
              ],
              permissions: {
                projectAdmin: 'write',
                translator: 'write'
              }
            }
          ]
        })
      );
    });
  }
}
//# sourceMappingURL=sf-project-service.spec.js.map
