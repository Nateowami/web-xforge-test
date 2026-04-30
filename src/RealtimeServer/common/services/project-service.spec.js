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
const system_role_1 = require('../models/system-role');
const user_1 = require('../models/user');
const user_test_data_1 = require('../models/user-test-data');
const realtime_server_1 = require('../realtime-server');
const schema_version_repository_1 = require('../schema-version-repository');
const test_utils_1 = require('../utils/test-utils');
const project_service_1 = require('./project-service');
const PROJECTS_COLLECTION = 'projects';
describe('ProjectService', () => {
  it('allows serval admin to view any project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'servalAdmin', system_role_1.SystemRole.ServalAdmin);
      yield expect((0, test_utils_1.fetchDoc)(conn, PROJECTS_COLLECTION, 'project01')).resolves.not.toThrow();
    }));
  it('allows system admin to view any project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'systemAdmin', system_role_1.SystemRole.SystemAdmin);
      yield expect((0, test_utils_1.fetchDoc)(conn, PROJECTS_COLLECTION, 'project01')).resolves.not.toThrow();
    }));
  it('allows system admin to edit any project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'systemAdmin', system_role_1.SystemRole.SystemAdmin);
      yield expect((0, test_utils_1.submitOp)(conn, PROJECTS_COLLECTION, 'project01', [])).resolves.not.toThrow();
    }));
  it('allows project member to view project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect((0, test_utils_1.fetchDoc)(conn, PROJECTS_COLLECTION, 'project01')).resolves.not.toThrow();
    }));
  it('allows project admin to edit project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'projectAdmin');
      yield expect((0, test_utils_1.submitOp)(conn, PROJECTS_COLLECTION, 'project01', [])).resolves.not.toThrow();
    }));
  it('does not allow non-admin to edit project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect((0, test_utils_1.submitOp)(conn, PROJECTS_COLLECTION, 'project01', [])).rejects.toThrow();
    }));
  it('does not allow non-member to view project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect((0, test_utils_1.fetchDoc)(conn, PROJECTS_COLLECTION, 'project01')).rejects.toThrow();
    }));
  it('allows system admin to edit immutable properties', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'systemAdmin', system_role_1.SystemRole.SystemAdmin);
      yield expect(
        (0, test_utils_1.submitJson0Op)(conn, PROJECTS_COLLECTION, 'project01', ops => ops.set(p => p.name, 'New Name'))
      ).resolves.not.toThrow();
    }));
  it('does not allow user to edit immutable properties', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'projectAdmin');
      yield expect(
        (0, test_utils_1.submitJson0Op)(conn, PROJECTS_COLLECTION, 'project01', ops => ops.set(p => p.name, 'New Name'))
      ).rejects.toThrow();
    }));
});
class TestProjectService extends project_service_1.ProjectService {
  constructor() {
    super([]);
    this.collection = PROJECTS_COLLECTION;
    this.indexPaths = [];
    this.projectAdminRole = 'admin';
  }
}
class TestEnvironment {
  constructor() {
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.service = new TestProjectService();
    const ShareDBMingoType = sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB);
    this.db = new ShareDBMingoType();
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      false,
      [this.service],
      PROJECTS_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
    (0, test_utils_1.allowAll)(this.server, user_1.USERS_COLLECTION);
  }
  createData() {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'systemAdmin',
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
        'projectAdmin',
        (0, user_test_data_1.createTestUser)({}, 2)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'user',
        (0, user_test_data_1.createTestUser)({}, 3)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'nonmember',
        (0, user_test_data_1.createTestUser)({}, 4)
      );
      yield (0, test_utils_1.createDoc)(conn, PROJECTS_COLLECTION, 'project01', {
        name: 'Project 01',
        userRoles: {
          projectAdmin: 'admin',
          user: 'user'
        },
        rolePermissions: {},
        userPermissions: {}
      });
    });
  }
}
//# sourceMappingURL=project-service.spec.js.map
