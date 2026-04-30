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
const metadata_db_1 = require('./metadata-db');
const user_1 = require('./models/user');
const user_test_data_1 = require('./models/user-test-data');
const realtime_server_1 = require('./realtime-server');
const schema_version_repository_1 = require('./schema-version-repository');
const project_service_1 = require('./services/project-service');
const user_service_1 = require('./services/user-service');
const sharedb_utils_1 = require('./utils/sharedb-utils');
const test_utils_1 = require('./utils/test-utils');
const PROJECTS_COLLECTION = 'projects';
describe('RealtimeServer', () => {
  it('migrates docs when schema version does not exist', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment(false, true);
      yield env.createData();
      (0, ts_mockito_1.when)(env.mockedUserService.schemaVersion).thenReturn(1);
      const mockedMigration = (0, ts_mockito_1.mock)();
      (0, ts_mockito_1.when)(env.mockedUserService.getMigration(1)).thenReturn(
        (0, ts_mockito_1.instance)(mockedMigration)
      );
      (0, ts_mockito_1.when)(mockedMigration.migrateDoc((0, ts_mockito_1.anything)())).thenCall(doc =>
        (0, realtime_server_1.submitMigrationOp)(1, doc, [{ p: ['test'], oi: 'test_op' }])
      );
      yield env.server.migrateIfNecessary();
      (0, ts_mockito_1.verify)(mockedMigration.migrateDoc((0, ts_mockito_1.anything)())).once();
      (0, ts_mockito_1.verify)(env.mockedSchemaVersionRepository.set(user_1.USERS_COLLECTION, 1)).once();
      const ops = env.db.ops[user_1.USERS_COLLECTION]['user01'];
      expect(ops[1].m.migration).toEqual(1);
    }));
  it('migrates docs when schema version exists', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment(false, true);
      yield env.createData();
      (0, ts_mockito_1.when)(env.mockedProjectService.schemaVersion).thenReturn(2);
      const mockedMigration = (0, ts_mockito_1.mock)();
      (0, ts_mockito_1.when)(env.mockedProjectService.getMigration(2)).thenReturn(
        (0, ts_mockito_1.instance)(mockedMigration)
      );
      (0, ts_mockito_1.when)(mockedMigration.migrateDoc((0, ts_mockito_1.anything)())).thenCall(doc =>
        (0, realtime_server_1.submitMigrationOp)(2, doc, [{ p: ['test'], oi: 'test_op' }])
      );
      yield env.server.migrateIfNecessary();
      (0, ts_mockito_1.verify)(mockedMigration.migrateDoc((0, ts_mockito_1.anything)())).once();
      (0, ts_mockito_1.verify)(env.mockedSchemaVersionRepository.set(PROJECTS_COLLECTION, 2)).once();
      const ops = env.db.ops[PROJECTS_COLLECTION]['project01'];
      expect(ops[1].m.migration).toEqual(2);
    }));
  it('does not migrate docs when migrations are disabled', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment(true);
      yield env.createData();
      (0, ts_mockito_1.when)(env.mockedProjectService.schemaVersion).thenReturn(2);
      const mockedMigration = (0, ts_mockito_1.mock)();
      (0, ts_mockito_1.when)(env.mockedProjectService.getMigration(2)).thenReturn(
        (0, ts_mockito_1.instance)(mockedMigration)
      );
      (0, ts_mockito_1.when)(mockedMigration.migrateDoc((0, ts_mockito_1.anything)())).thenCall(doc =>
        (0, realtime_server_1.submitMigrationOp)(2, doc, [])
      );
      yield env.server.migrateIfNecessary();
      (0, ts_mockito_1.verify)(mockedMigration.migrateDoc((0, ts_mockito_1.anything)())).never();
      (0, ts_mockito_1.verify)(env.mockedSchemaVersionRepository.set(PROJECTS_COLLECTION, 2)).never();
      const ops = env.db.ops[PROJECTS_COLLECTION]['project01'];
      expect(ops[1]).toBeUndefined();
    }));
  it('does not migrate empty ops', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      const userDoc = yield (0, test_utils_1.fetchDoc)(userConn, user_1.USERS_COLLECTION, 'user01');
      yield env.migrateDoc(user_1.USERS_COLLECTION, 'user01', 1, []);
      const mockedMigration = (0, ts_mockito_1.mock)();
      (0, ts_mockito_1.when)(env.mockedUserService.getMigration(1)).thenReturn(
        (0, ts_mockito_1.instance)(mockedMigration)
      );
      yield (0, sharedb_utils_1.docSubmitOp)(userDoc, []);
      (0, ts_mockito_1.verify)(mockedMigration.migrateOp((0, ts_mockito_1.anything)())).never();
      const ops = env.db.ops[user_1.USERS_COLLECTION]['user01'];
      expect(ops.length).toEqual(2);
    }));
  it('migrates op', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment(false, true);
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      const userDoc = yield (0, test_utils_1.fetchDoc)(userConn, user_1.USERS_COLLECTION, 'user01');
      yield env.migrateDoc(user_1.USERS_COLLECTION, 'user01', 1, [{ p: ['test'], oi: 'test_op' }]);
      const mockedMigration = (0, ts_mockito_1.mock)();
      (0, ts_mockito_1.when)(env.mockedUserService.getMigration(1)).thenReturn(
        (0, ts_mockito_1.instance)(mockedMigration)
      );
      yield (0, sharedb_utils_1.docSubmitOp)(userDoc, []);
      (0, ts_mockito_1.verify)(mockedMigration.migrateOp((0, ts_mockito_1.anything)())).once();
      const ops = env.db.ops[user_1.USERS_COLLECTION]['user01'];
      expect(ops.length).toEqual(3);
    }));
  it('gets correct project', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      let session;
      env.server.use('submit', (context, callback) => {
        session = context.agent.connectSession;
        callback();
      });
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', []);
      expect(session.userId).toEqual('user01');
      const project = yield env.server.getProject('project01');
      expect(project === null || project === void 0 ? void 0 : project.name).toEqual('Project 01');
    }));
  it('gets correct project when new project added', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      let session;
      env.server.use('submit', (context, callback) => {
        session = context.agent.connectSession;
        callback();
      });
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield env.createDoc(PROJECTS_COLLECTION, 'project02', {
        name: 'Project 02',
        userRoles: {
          user01: 'user'
        },
        rolePermissions: {},
        userPermissions: {}
      });
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project02', []);
      expect(session.userId).toEqual('user01');
      const project = yield env.server.getProject('project02');
      expect(project === null || project === void 0 ? void 0 : project.name).toEqual('Project 02');
    }));
  it('data validation allows key value pairs', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
        {
          p: ['userPermissions', 'abc123'],
          oi: 'admin'
        }
      ]);
    }));
  it('data validation stops invalid key value pairs', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
          {
            p: ['userPermissions', 'USER01'],
            oi: 'admin'
          }
        ])
      ).rejects.toThrow('Invalid path for operation');
    }));
  it('data validation stops invalid ops', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
          {
            p: ['this_property_does_not_exist'],
            oi: 'invalid data'
          }
        ])
      ).rejects.toThrow('Invalid path for operation');
    }));
  it('data validation stops ops that have invalid paths', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
          {
            p: [0],
            oi: 'invalid data'
          }
        ])
      ).rejects.toThrow('Invalid path for operation');
    }));
  it('data validation allows valid boolean values', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['isDisplayNameConfirmed'],
          oi: true
        }
      ]);
    }));
  it('data validation blocks invalid boolean values', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
          {
            p: ['isDisplayNameConfirmed'],
            oi: 'true'
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation allows valid null values', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['_type'],
          oi: null
        }
      ]);
    }));
  it('data validation allows valid number values', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['_v'],
          oi: 1
        }
      ]);
    }));
  it('data validation blocks invalid number values', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
          {
            p: ['_v'],
            oi: '1'
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation allows string values', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['displayName'],
          oi: 'string value'
        }
      ]);
    }));
  it('data validation blocks invalid string values', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
          {
            p: ['displayName'],
            oi: 1
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation allows string values matching a pattern', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['_id'],
          oi: 'abc123'
        }
      ]);
    }));
  it('data validation blocks string values not matching a pattern', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
          {
            p: ['_id'],
            oi: 'INVALID_ID'
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation allows string values matching an enum', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
        {
          p: ['enumExample'],
          oi: 'first'
        }
      ]);
    }));
  it('data validation blocks string values not matching an enum', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
          {
            p: ['enumExample'],
            oi: 'third'
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation allows adding of items to arrays', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['sites', 'sf', 'projects', 0],
          li: 'project02'
        }
      ]);
    }));
  it('data validation blocks adding of items with invalid values to arrays', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
          {
            p: ['sites', 'sf', 'projects', 0],
            li: 1
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation allows replacing arrays', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['sites', 'sf', 'projects'],
          oi: ['project02', 'project02']
        }
      ]);
    }));
  it('data validation allows adding of objects', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
        {
          p: ['objectExample'],
          oi: {
            aNumber: 1,
            aBool: true
          }
        }
      ]);
    }));
  it('data validation blocks adding of objects with invalid values', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
          {
            p: ['objectExample'],
            oi: {
              aNumber: 1,
              aBool: 'invalid_value'
            }
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation blocks adding of objects with invalid properties', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield expect(
        (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
          {
            p: ['objectExample'],
            oi: {
              aNumber: 1,
              invalidProperty: 'invalid_value'
            }
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation blocks adding of objects with invalid properties to key value pairs', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
        {
          p: ['kvpExample'],
          oi: { test01: { aNumber: 1 } }
        }
      ]);
      // SUT
      yield expect(
        (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
          {
            p: ['kvpExample', 'test01'],
            oi: {
              aNumber: 1,
              invalidProperty: 'invalid_value'
            }
          }
        ])
      ).rejects.toThrow('Invalid operation data');
    }));
  it('data validation allows number operations', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
        {
          p: ['numberExample'],
          oi: 1
        }
      ]);
      // SUT
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
        {
          p: ['numberExample'],
          na: 1
        }
      ]);
    }));
  it('data validation allows operations on property with no data validation configured', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, PROJECTS_COLLECTION, 'project01', [
        {
          p: ['noDataValidationExample'],
          oi: 'test data'
        }
      ]);
    }));
  it('disabling data validation does not stop invalid ops', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment(false, true);
      yield env.createData();
      const userConn = (0, test_utils_1.clientConnect)(env.server, 'user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['this_property_does_not_exist'],
          oi: 'invalid data'
        }
      ]);
    }));
  it('connection from the backend server does not validate data', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const userConn = env.server.connect('user01');
      yield (0, test_utils_1.submitOp)(userConn, user_1.USERS_COLLECTION, 'user01', [
        {
          p: ['this_property_does_not_exist'],
          oi: 'invalid data'
        }
      ]);
    }));
  it('validation schemas are loaded for every doc service', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.server.addValidationSchema(env.mongo);
      (0, ts_mockito_1.verify)(env.mockedProjectService.addValidationSchema(env.mongo)).once();
      (0, ts_mockito_1.verify)(env.mockedUserService.addValidationSchema(env.mongo)).once();
    }));
  it('indexes are created for every doc service', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.server.createIndexes(env.mongo);
      (0, ts_mockito_1.verify)(env.mockedSchemaVersionRepository.createIndex()).once();
      (0, ts_mockito_1.verify)(env.mockedProjectService.createIndexes(env.mongo)).once();
      (0, ts_mockito_1.verify)(env.mockedUserService.createIndexes(env.mongo)).once();
    }));
});
class TestEnvironment {
  constructor(migrationsDisabled = false, dataValidationDisabled = false) {
    this.mockedUserService = (0, ts_mockito_1.mock)(user_service_1.UserService);
    this.mockedProjectService = (0, ts_mockito_1.mock)(project_service_1.ProjectService);
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.mongo = (0, ts_mockito_1.mock)(mongodb_1.Db);
    const ShareDBMingoType = (0, metadata_db_1.MetadataDB)(
      sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB)
    );
    this.db = new ShareDBMingoType();
    (0, ts_mockito_1.when)(this.mockedSchemaVersionRepository.getAll()).thenResolve([
      { _id: PROJECTS_COLLECTION, collection: PROJECTS_COLLECTION, version: 1 }
    ]);
    (0, ts_mockito_1.when)(this.mockedUserService.collection).thenReturn(user_1.USERS_COLLECTION);
    const userService = new user_service_1.UserService();
    (0, ts_mockito_1.when)(this.mockedUserService.validationSchema).thenReturn(userService.validationSchema);
    // Add some extra values to the project schema for testing uncommon validation cases
    (0, ts_mockito_1.when)(this.mockedProjectService.validationSchema).thenReturn({
      bsonType: project_service_1.ProjectService.validationSchema.bsonType,
      required: project_service_1.ProjectService.validationSchema.required,
      properties: Object.assign(Object.assign({}, project_service_1.ProjectService.validationSchema.properties), {
        enumExample: {
          bsonType: 'string',
          enum: ['first', 'second']
        },
        noDataValidationExample: {},
        numberExample: {
          bsonType: 'number'
        },
        objectExample: {
          bsonType: 'object',
          properties: {
            aNumber: {
              bsonType: 'int'
            },
            aBool: {
              bsonType: 'bool'
            },
            childArray: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  aNumber: {
                    bsonType: 'int'
                  },
                  aString: {
                    bsonType: 'string'
                  }
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        },
        kvpExample: {
          bsonType: 'object',
          patternProperties: {
            '^[0-9a-z]+$': {
              bsonType: 'object',
              properties: {
                aNumber: {
                  bsonType: 'int'
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      })
    });
    (0, ts_mockito_1.when)(this.mockedProjectService.collection).thenReturn(PROJECTS_COLLECTION);
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      migrationsDisabled,
      dataValidationDisabled,
      [(0, ts_mockito_1.instance)(this.mockedUserService), (0, ts_mockito_1.instance)(this.mockedProjectService)],
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
        'user01',
        (0, user_test_data_1.createTestUser)({
          sites: {
            sf: {
              projects: []
            }
          }
        })
      );
      yield (0, test_utils_1.createDoc)(conn, PROJECTS_COLLECTION, 'project01', {
        name: 'Project 01',
        userRoles: {
          user01: 'admin'
        },
        rolePermissions: {},
        userPermissions: {}
      });
    });
  }
  migrateDoc(collection, id, version, ops) {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      const doc = conn.get(collection, id);
      yield (0, sharedb_utils_1.docFetch)(doc);
      yield (0, realtime_server_1.submitMigrationOp)(version, doc, ops);
    });
  }
  createDoc(collection, id, data) {
    const conn = this.server.connect();
    return (0, test_utils_1.createDoc)(conn, collection, id, data);
  }
  submitJson0Op(collection, id, build) {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      return (0, test_utils_1.submitJson0Op)(conn, collection, id, build);
    });
  }
}
//# sourceMappingURL=realtime-server.spec.js.map
