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
const mongodb_1 = require('mongodb');
const sharedb_1 = __importDefault(require('sharedb'));
const sharedb_mingo_memory_1 = __importDefault(require('sharedb-mingo-memory'));
const ts_mockito_1 = require('ts-mockito');
const system_role_1 = require('../models/system-role');
const user_1 = require('../models/user');
const user_test_data_1 = require('../models/user-test-data');
const realtime_server_1 = require('../realtime-server');
const schema_version_repository_1 = require('../schema-version-repository');
const test_utils_1 = require('../utils/test-utils');
const user_service_1 = require('./user-service');
describe('UserService', () => {
  it('allows system admin to view others', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user01', system_role_1.SystemRole.SystemAdmin);
      yield expect((0, test_utils_1.fetchDoc)(conn, user_1.USERS_COLLECTION, 'user02')).resolves.not.toThrow();
    }));
  it('allows system admin to edit others', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user01', system_role_1.SystemRole.SystemAdmin);
      yield expect((0, test_utils_1.submitOp)(conn, user_1.USERS_COLLECTION, 'user02', [])).resolves.not.toThrow();
    }));
  it('allows user to view itself', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user02', system_role_1.SystemRole.User);
      yield expect((0, test_utils_1.fetchDoc)(conn, user_1.USERS_COLLECTION, 'user02')).resolves.not.toThrow();
    }));
  it('allows user to edit itself', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user02', system_role_1.SystemRole.User);
      yield expect((0, test_utils_1.submitOp)(conn, user_1.USERS_COLLECTION, 'user02', [])).resolves.not.toThrow();
    }));
  it('does not allow user to view others', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user02', system_role_1.SystemRole.User);
      yield expect((0, test_utils_1.fetchDoc)(conn, user_1.USERS_COLLECTION, 'user01')).rejects.toThrow();
    }));
  it('does not allow user to edit others', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user02', system_role_1.SystemRole.User);
      yield expect((0, test_utils_1.submitOp)(conn, user_1.USERS_COLLECTION, 'user01', [])).rejects.toThrow();
    }));
  it('allows user to view other user profiles', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user02', system_role_1.SystemRole.User);
      yield expect((0, test_utils_1.fetchDoc)(conn, user_1.USER_PROFILES_COLLECTION, 'user01')).resolves.not.toThrow();
    }));
  it('allows system admin to edit immutable properties', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user01', system_role_1.SystemRole.SystemAdmin);
      yield expect(
        (0, test_utils_1.submitJson0Op)(conn, user_1.USERS_COLLECTION, 'user02', ops =>
          ops.set(u => u.roles, [system_role_1.SystemRole.SystemAdmin])
        )
      ).resolves.not.toThrow();
    }));
  it('does not allow user to edit immutable properties', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user02', system_role_1.SystemRole.User);
      yield expect(
        (0, test_utils_1.submitJson0Op)(conn, user_1.USERS_COLLECTION, 'user02', ops =>
          ops.set(u => u.roles, [system_role_1.SystemRole.SystemAdmin])
        )
      ).rejects.toThrow();
    }));
  it('adds the validation schema to an existing collection', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment(true);
      yield env.service.addValidationSchema((0, ts_mockito_1.instance)(env.mongo));
      (0, ts_mockito_1.verify)(
        env.mongo.command(
          (0, ts_mockito_1.objectContaining)({
            validator: {
              $jsonSchema: env.service.validationSchema
            }
          })
        )
      ).once();
      (0, ts_mockito_1.verify)(env.mongo.createCollection(env.service.collection)).never();
    }));
  it('adds the validation schema and creates the collection if it is missing', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.service.addValidationSchema((0, ts_mockito_1.instance)(env.mongo));
      (0, ts_mockito_1.verify)(
        env.mongo.command(
          (0, ts_mockito_1.objectContaining)({
            validator: {
              $jsonSchema: env.service.validationSchema
            }
          })
        )
      ).once();
      (0, ts_mockito_1.verify)(env.mongo.createCollection(env.service.collection)).once();
    }));
});
class TestEnvironment {
  constructor(collectionExists = false) {
    this.mongo = (0, ts_mockito_1.mock)(mongodb_1.Db);
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.service = new user_service_1.UserService();
    const ShareDBMingoType = sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB);
    this.db = new ShareDBMingoType();
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      false,
      [this.service],
      'projects',
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
    // This is used by addValidationSchema()
    const cursor = (0, ts_mockito_1.mock)(mongodb_1.ListCollectionsCursor);
    (0, ts_mockito_1.when)(cursor.hasNext()).thenResolve(collectionExists);
    (0, ts_mockito_1.when)(this.mongo.listCollections((0, ts_mockito_1.anything)())).thenReturn(
      (0, ts_mockito_1.instance)(cursor)
    );
  }
  createData() {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'user01',
        (0, user_test_data_1.createTestUser)(
          {
            roles: [system_role_1.SystemRole.SystemAdmin]
          },
          1
        )
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'user02',
        (0, user_test_data_1.createTestUser)({}, 2)
      );
    });
  }
}
//# sourceMappingURL=user-service.spec.js.map
