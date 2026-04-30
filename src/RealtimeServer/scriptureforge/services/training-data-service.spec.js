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
const sf_project_1 = require('../models/sf-project');
const sf_project_role_1 = require('../models/sf-project-role');
const sf_project_test_data_1 = require('../models/sf-project-test-data');
const training_data_1 = require('../models/training-data');
const training_data_service_1 = require('./training-data-service');
describe('TrainingDataService', () => {
  it('allows translator to view training data', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'translator');
      yield expect(
        (0, test_utils_1.fetchDoc)(
          conn,
          training_data_1.TRAINING_DATA_COLLECTION,
          (0, training_data_1.getTrainingDataId)('project01', 'dataid01')
        )
      ).resolves.not.toThrow();
    }));
  it('allows administrator to edit training data', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'administrator');
      yield expect(
        (0, test_utils_1.submitJson0Op)(
          conn,
          training_data_1.TRAINING_DATA_COLLECTION,
          (0, training_data_1.getTrainingDataId)('project01', 'dataid01'),
          op => op.set(n => n.skipRows, 1)
        )
      ).resolves.not.toThrow();
    }));
  it('does not allow consultant to view training data', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'consultant');
      yield expect(
        (0, test_utils_1.fetchDoc)(
          conn,
          training_data_1.TRAINING_DATA_COLLECTION,
          (0, training_data_1.getTrainingDataId)('project01', 'dataid01')
        )
      ).rejects.toThrow();
    }));
});
class TestEnvironment {
  constructor() {
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.service = new training_data_service_1.TrainingDataService();
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
  }
  createData() {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'administrator',
        (0, user_test_data_1.createTestUser)({}, 1)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'translator',
        (0, user_test_data_1.createTestUser)({}, 2)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'consultant',
        (0, user_test_data_1.createTestUser)({}, 3)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_1.SF_PROJECTS_COLLECTION,
        'project01',
        (0, sf_project_test_data_1.createTestProject)({
          userRoles: {
            administrator: sf_project_role_1.SFProjectRole.ParatextAdministrator,
            translator: sf_project_role_1.SFProjectRole.ParatextTranslator,
            consultant: sf_project_role_1.SFProjectRole.ParatextConsultant
          }
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        training_data_1.TRAINING_DATA_COLLECTION,
        (0, training_data_1.getTrainingDataId)('project01', 'dataid01'),
        {
          dataId: 'dataid01',
          projectRef: 'project01',
          ownerRef: 'user01',
          fileUrl: 'project01/user01_file01.csv?t=123456789123456789',
          mimeType: 'text/csv',
          skipRows: 0,
          title: 'Test File',
          deleted: false
        }
      );
    });
  }
}
//# sourceMappingURL=training-data-service.spec.js.map
