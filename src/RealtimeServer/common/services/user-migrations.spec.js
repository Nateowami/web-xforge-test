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
const metadata_db_1 = require('../../common/metadata-db');
const system_role_1 = require('../../common/models/system-role');
const user_1 = require('../../common/models/user');
const realtime_server_1 = require('../../common/realtime-server');
const schema_version_repository_1 = require('../../common/schema-version-repository');
const test_utils_1 = require('../../common/utils/test-utils');
const user_service_1 = require('./user-service');
describe('UserMigrations', () => {
  describe('version 1', () => {
    it('migrates users with a role', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(0);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, user_1.USERS_COLLECTION, 'user01', {
          role: system_role_1.SystemRole.SystemAdmin
        });
        yield env.server.migrateIfNecessary();
        const projectDoc = yield (0, test_utils_1.fetchDoc)(conn, user_1.USERS_COLLECTION, 'user01');
        expect(projectDoc.data.roles[0]).toBe(system_role_1.SystemRole.SystemAdmin);
        expect(projectDoc.data.role).toBeUndefined();
      }));
    it('migrates users without a role', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(0);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, user_1.USERS_COLLECTION, 'user01', {});
        yield env.server.migrateIfNecessary();
        const projectDoc = yield (0, test_utils_1.fetchDoc)(conn, user_1.USERS_COLLECTION, 'user01');
        expect(projectDoc.data.roles.length).toBe(0);
        expect(projectDoc.data.role).toBeUndefined();
      }));
  });
});
class TestEnvironment {
  /**
   * @param version The version the document is currently at (so migrations prior to this version will not be run
   * on the document)
   */
  constructor(version) {
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    const ShareDBMingoType = (0, metadata_db_1.MetadataDB)(
      sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB)
    );
    this.db = new ShareDBMingoType();
    (0, ts_mockito_1.when)(this.mockedSchemaVersionRepository.getAll()).thenResolve([
      { _id: user_1.USERS_COLLECTION, collection: user_1.USERS_COLLECTION, version }
    ]);
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      true,
      [new user_service_1.UserService()],
      user_1.USERS_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
  }
}
//# sourceMappingURL=user-migrations.spec.js.map
