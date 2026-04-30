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
const project_rights_1 = require('../models/project-rights');
const user_1 = require('../models/user');
const user_test_data_1 = require('../models/user-test-data');
const realtime_server_1 = require('../realtime-server');
const schema_version_repository_1 = require('../schema-version-repository');
const obj_path_1 = require('../utils/obj-path');
const test_utils_1 = require('../utils/test-utils');
const project_data_service_1 = require('./project-data-service');
const project_service_1 = require('./project-service');
const user_service_1 = require('./user-service');
const PROJECTS_COLLECTION = 'projects';
const TEST_DATA_COLLECTION = 'test_data';
describe('ProjectDataService', () => {
  it('controls access to view root entity', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const nonmemberConn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect((0, test_utils_1.fetchDoc)(nonmemberConn, TEST_DATA_COLLECTION, 'test01')).rejects.toThrow();
      const userOwnConn = (0, test_utils_1.clientConnect)(env.server, 'userOwn');
      yield expect((0, test_utils_1.fetchDoc)(userOwnConn, TEST_DATA_COLLECTION, 'test01')).rejects.toThrow();
      yield expect((0, test_utils_1.fetchDoc)(userOwnConn, TEST_DATA_COLLECTION, 'test03')).resolves.not.toThrow();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect((0, test_utils_1.fetchDoc)(adminConn, TEST_DATA_COLLECTION, 'test01')).resolves.not.toThrow();
    }));
  it('controls access to create root entity', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const nonmemberConn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect(
        (0, test_utils_1.createDoc)(nonmemberConn, TEST_DATA_COLLECTION, 'test04', {
          projectRef: 'project01',
          ownerRef: 'nonmember',
          children: []
        })
      ).rejects.toThrow();
      const observerConn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect(
        (0, test_utils_1.createDoc)(observerConn, TEST_DATA_COLLECTION, 'test04', {
          projectRef: 'project01',
          ownerRef: 'observer',
          children: []
        })
      ).rejects.toThrow();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect(
        (0, test_utils_1.createDoc)(adminConn, TEST_DATA_COLLECTION, 'test04', {
          projectRef: 'project01',
          ownerRef: 'admin',
          children: []
        })
      ).resolves.not.toThrow();
    }));
  it('controls access to create child entity', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const nonmemberConn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect(
        (0, test_utils_1.submitJson0Op)(nonmemberConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.add(d => d.children, { id: 'sub04', ownerRef: 'nonmember', children: [] })
        )
      ).rejects.toThrow();
      const observerConn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect(
        (0, test_utils_1.submitJson0Op)(observerConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.add(d => d.children, { id: 'sub04', ownerRef: 'observer', children: [] })
        )
      ).rejects.toThrow();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect(
        (0, test_utils_1.submitJson0Op)(adminConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.add(d => d.children, { id: 'sub04', ownerRef: 'admin', children: [] })
        )
      ).resolves.not.toThrow();
    }));
  it('controls access to edit root entity', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const nonmemberConn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect(
        (0, test_utils_1.submitJson0Op)(nonmemberConn, TEST_DATA_COLLECTION, 'test01', ops => ops.set(d => d.num, 1))
      ).rejects.toThrow();
      const observerConn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect(
        (0, test_utils_1.submitJson0Op)(observerConn, TEST_DATA_COLLECTION, 'test01', ops => ops.set(d => d.num, 1))
      ).rejects.toThrow();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test01', ops => ops.set(d => d.num, 1))
      ).rejects.toThrow();
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test02', ops => ops.set(d => d.num, 1))
      ).resolves.not.toThrow();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect(
        (0, test_utils_1.submitJson0Op)(adminConn, TEST_DATA_COLLECTION, 'test01', ops => ops.set(d => d.num, 1))
      ).resolves.not.toThrow();
    }));
  it('controls access to edit child entity', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const nonmemberConn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect(
        (0, test_utils_1.submitJson0Op)(nonmemberConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.set(d => d.children[0].num, 1)
        )
      ).rejects.toThrow();
      const observerConn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect(
        (0, test_utils_1.submitJson0Op)(observerConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.set(d => d.children[0].num, 1)
        )
      ).rejects.toThrow();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.set(d => d.children[0].num, 1)
        )
      ).rejects.toThrow();
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test02', ops =>
          ops.set(d => d.children[0].num, 1)
        )
      ).resolves.not.toThrow();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect(
        (0, test_utils_1.submitJson0Op)(adminConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.set(d => d.children[0].num, 1)
        )
      ).resolves.not.toThrow();
    }));
  it('controls access to delete root entity', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const nonmemberConn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect((0, test_utils_1.deleteDoc)(nonmemberConn, TEST_DATA_COLLECTION, 'test01')).rejects.toThrow();
      const observerConn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect((0, test_utils_1.deleteDoc)(observerConn, TEST_DATA_COLLECTION, 'test01')).rejects.toThrow();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect((0, test_utils_1.deleteDoc)(userConn, TEST_DATA_COLLECTION, 'test01')).rejects.toThrow();
      yield expect((0, test_utils_1.deleteDoc)(userConn, TEST_DATA_COLLECTION, 'test02')).resolves.not.toThrow();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect((0, test_utils_1.deleteDoc)(adminConn, TEST_DATA_COLLECTION, 'test01')).resolves.not.toThrow();
    }));
  it('controls access to delete child entity', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const nonmemberConn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect(
        (0, test_utils_1.submitJson0Op)(nonmemberConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.remove(d => d.children, 0)
        )
      ).rejects.toThrow();
      const observerConn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect(
        (0, test_utils_1.submitJson0Op)(observerConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.remove(d => d.children, 0)
        )
      ).rejects.toThrow();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test01', ops => ops.remove(d => d.children, 0))
      ).rejects.toThrow();
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test02', ops => ops.remove(d => d.children, 0))
      ).resolves.not.toThrow();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect(
        (0, test_utils_1.submitJson0Op)(adminConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.remove(d => d.children, 0)
        )
      ).resolves.not.toThrow();
    }));
  it('controls access to immutable properties', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect(
        (0, test_utils_1.submitJson0Op)(adminConn, TEST_DATA_COLLECTION, 'test01', ops =>
          ops.set(d => d.immutable, 'test')
        )
      ).rejects.toThrow();
    }));
  it('controls access to create and edit child entity in one submit', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test02', ops =>
          ops.add(d => d.children, { id: 'sub04', ownerRef: 'user', children: [] }).set(d => d.children[1].num, 1)
        )
      ).resolves.not.toThrow();
    }));
  it('controls access to create, edit, and delete child entity in one submit', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test02', ops =>
          ops
            .add(d => d.children, { id: 'sub04', ownerRef: 'user', children: [] })
            .insert(d => d.children[1].children, 0, { id: 'sub05', ownerRef: 'user' })
            .set(d => d.children[1].children[0].num, 1)
            .remove(d => d.children[1].children, 0, { id: 'sub05', ownerRef: 'user', num: 1 })
        )
      ).resolves.not.toThrow();
    }));
  it('handles updates to the deleted property as delete operations', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user');
      yield expect(
        (0, test_utils_1.submitJson0Op)(userConn, TEST_DATA_COLLECTION, 'test02', ops =>
          ops.insert(d => d.children[0].children, 0, { id: 'sub05', ownerRef: 'user' })
        )
      ).resolves.not.toThrow();
      const adminConn = (0, test_utils_1.clientConnect)(env.server, 'admin');
      yield expect(
        (0, test_utils_1.submitJson0Op)(adminConn, TEST_DATA_COLLECTION, 'test02', ops =>
          ops.set(d => d.children[0].children[0].num, 1)
        )
      ).rejects.toThrow();
      yield expect(
        (0, test_utils_1.submitJson0Op)(adminConn, TEST_DATA_COLLECTION, 'test02', ops =>
          ops.set(d => d.children[0].children[0].deleted, true)
        )
      ).resolves.not.toThrow();
    }));
  it('denies updates to the deleted property if delete operations are not permitted', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userOwnConn = (0, test_utils_1.clientConnect)(env.server, 'userOwn');
      yield expect(
        (0, test_utils_1.submitJson0Op)(userOwnConn, TEST_DATA_COLLECTION, 'test03', ops =>
          ops.insert(d => d.children[0].children, 0, { id: 'sub05', ownerRef: 'userOwn' })
        )
      ).resolves.not.toThrow();
      yield expect(
        (0, test_utils_1.submitJson0Op)(userOwnConn, TEST_DATA_COLLECTION, 'test03', ops =>
          ops.set(d => d.children[0].children[0].num, 1)
        )
      ).resolves.not.toThrow();
      yield expect(
        (0, test_utils_1.submitJson0Op)(userOwnConn, TEST_DATA_COLLECTION, 'test03', ops =>
          ops.set(d => d.children[0].children[0].deleted, true)
        )
      ).rejects.toThrow();
    }));
});
var TestProjectDomain;
(function (TestProjectDomain) {
  TestProjectDomain['TestData'] = 'test_data';
  TestProjectDomain['SubData'] = 'sub_data';
  TestProjectDomain['SubSubData'] = 'sub_sub_data';
})(TestProjectDomain || (TestProjectDomain = {}));
class TestDataService extends project_data_service_1.ProjectDataService {
  constructor() {
    super([]);
    this.collection = 'test_data';
    this.indexPaths = [];
    this.immutableProps = [this.pathTemplate(d => d.immutable)];
    this.validationSchema = {
      bsonType: project_data_service_1.ProjectDataService.validationSchema.bsonType,
      required: project_data_service_1.ProjectDataService.validationSchema.required,
      properties: Object.assign(
        Object.assign({}, project_data_service_1.ProjectDataService.validationSchema.properties),
        {
          _id: {
            bsonType: 'string',
            pattern: '^[0-9a-f]+:[0-9A-Z]+:[0-9]+:target$'
          },
          num: {
            bsonType: 'int'
          },
          immutable: {
            bsonType: 'string'
          },
          children: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['id', 'children', 'ownerRef'],
              properties: {
                id: {
                  bsonType: 'string'
                },
                num: {
                  bsonType: 'int'
                },
                children: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    required: ['id', 'ownerRef'],
                    properties: {
                      id: {
                        bsonType: 'string'
                      },
                      num: {
                        bsonType: 'int'
                      },
                      deleted: {
                        bsonType: 'bool'
                      },
                      ownerRef: {
                        bsonType: 'string'
                      }
                    },
                    additionalProperties: false
                  }
                },
                ownerRef: {
                  bsonType: 'string'
                }
              },
              additionalProperties: false
            }
          }
        }
      ),
      additionalProperties: false
    };
    this.projectRights = new project_rights_1.ProjectRights({
      admin: [
        [TestProjectDomain.TestData, project_rights_1.Operation.View],
        [TestProjectDomain.TestData, project_rights_1.Operation.Create],
        [TestProjectDomain.TestData, project_rights_1.Operation.Edit],
        [TestProjectDomain.TestData, project_rights_1.Operation.Delete],
        [TestProjectDomain.SubData, project_rights_1.Operation.View],
        [TestProjectDomain.SubData, project_rights_1.Operation.Create],
        [TestProjectDomain.SubData, project_rights_1.Operation.Edit],
        [TestProjectDomain.SubData, project_rights_1.Operation.Delete],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.View],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.Create],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.EditOwn],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.Delete]
      ],
      user: [
        [TestProjectDomain.TestData, project_rights_1.Operation.View],
        [TestProjectDomain.TestData, project_rights_1.Operation.Create],
        [TestProjectDomain.TestData, project_rights_1.Operation.EditOwn],
        [TestProjectDomain.TestData, project_rights_1.Operation.DeleteOwn],
        [TestProjectDomain.SubData, project_rights_1.Operation.View],
        [TestProjectDomain.SubData, project_rights_1.Operation.Create],
        [TestProjectDomain.SubData, project_rights_1.Operation.EditOwn],
        [TestProjectDomain.SubData, project_rights_1.Operation.DeleteOwn],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.View],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.Create],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.EditOwn],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.DeleteOwn]
      ],
      userOwn: [
        [TestProjectDomain.TestData, project_rights_1.Operation.ViewOwn],
        [TestProjectDomain.TestData, project_rights_1.Operation.Create],
        [TestProjectDomain.TestData, project_rights_1.Operation.EditOwn],
        [TestProjectDomain.TestData, project_rights_1.Operation.DeleteOwn],
        [TestProjectDomain.SubData, project_rights_1.Operation.ViewOwn],
        [TestProjectDomain.SubData, project_rights_1.Operation.Create],
        [TestProjectDomain.SubData, project_rights_1.Operation.EditOwn],
        [TestProjectDomain.SubData, project_rights_1.Operation.DeleteOwn],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.ViewOwn],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.Create],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.EditOwn]
      ],
      observer: [
        [TestProjectDomain.TestData, project_rights_1.Operation.View],
        [TestProjectDomain.SubData, project_rights_1.Operation.View],
        [TestProjectDomain.SubSubData, project_rights_1.Operation.View]
      ]
    });
  }
  setupDomains() {
    return [
      { projectDomain: TestProjectDomain.TestData, pathTemplate: this.pathTemplate() },
      {
        projectDomain: TestProjectDomain.SubData,
        pathTemplate: this.pathTemplate(d => d.children[obj_path_1.ANY_INDEX])
      },
      {
        projectDomain: TestProjectDomain.SubSubData,
        pathTemplate: this.pathTemplate(d => d.children[obj_path_1.ANY_INDEX].children[obj_path_1.ANY_INDEX])
      }
    ];
  }
}
class TestEnvironment {
  constructor() {
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.mockedUserService = (0, ts_mockito_1.mock)(user_service_1.UserService);
    this.mockedProjectService = (0, ts_mockito_1.mock)(project_service_1.ProjectService);
    (0, ts_mockito_1.when)(this.mockedProjectService.collection).thenReturn(PROJECTS_COLLECTION);
    (0, ts_mockito_1.when)(this.mockedUserService.collection).thenReturn(user_1.USERS_COLLECTION);
    this.service = new TestDataService();
    const ShareDBMingoType = sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB);
    this.db = new ShareDBMingoType();
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      false,
      [
        this.service,
        (0, ts_mockito_1.instance)(this.mockedProjectService),
        (0, ts_mockito_1.instance)(this.mockedUserService)
      ],
      PROJECTS_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
    (0, test_utils_1.allowAll)(this.server, user_1.USERS_COLLECTION);
    (0, test_utils_1.allowAll)(this.server, PROJECTS_COLLECTION);
  }
  createData() {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'admin',
        (0, user_test_data_1.createTestUser)({}, 1)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'user',
        (0, user_test_data_1.createTestUser)({}, 2)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'userOwn',
        (0, user_test_data_1.createTestUser)({}, 3)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'observer',
        (0, user_test_data_1.createTestUser)({}, 4)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'nonmember',
        (0, user_test_data_1.createTestUser)({}, 5)
      );
      yield (0, test_utils_1.createDoc)(conn, PROJECTS_COLLECTION, 'project01', {
        name: 'Project 01',
        userRoles: {
          admin: 'admin',
          user: 'user',
          userOwn: 'userOwn',
          observer: 'observer'
        },
        rolePermissions: {},
        userPermissions: {}
      });
      yield (0, test_utils_1.createDoc)(conn, TEST_DATA_COLLECTION, 'test01', {
        projectRef: 'project01',
        ownerRef: 'admin',
        children: [{ id: 'sub01', ownerRef: 'admin', children: [] }]
      });
      yield (0, test_utils_1.createDoc)(conn, TEST_DATA_COLLECTION, 'test02', {
        projectRef: 'project01',
        ownerRef: 'user',
        children: [{ id: 'sub02', ownerRef: 'user', children: [] }]
      });
      yield (0, test_utils_1.createDoc)(conn, TEST_DATA_COLLECTION, 'test03', {
        projectRef: 'project01',
        ownerRef: 'userOwn',
        children: [{ id: 'sub03', ownerRef: 'userOwn', children: [] }]
      });
    });
  }
}
//# sourceMappingURL=project-data-service.spec.js.map
