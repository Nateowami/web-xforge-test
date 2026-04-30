'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            }
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
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
const RichText = __importStar(require('rich-text'));
const rich_text_1 = require('rich-text');
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
const text_data_1 = require('../models/text-data');
const text_service_1 = require('./text-service');
sharedb_1.default.types.register(RichText.type);
describe('TextService', () => {
  it('allows administrator to create text', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'administrator');
      yield expect(
        (0, test_utils_1.createDoc)(
          conn,
          text_data_1.TEXTS_COLLECTION,
          (0, text_data_1.getTextDocId)('project01', 40, 2),
          new rich_text_1.Delta()
        )
      ).resolves.not.toThrow();
    }));
  it('allows member to view text', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect(
        (0, test_utils_1.fetchDoc)(
          conn,
          text_data_1.TEXTS_COLLECTION,
          (0, text_data_1.getTextDocId)('project01', 40, 1)
        )
      ).resolves.not.toThrow();
    }));
  it('allows translator to edit text', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'translator');
      yield expect(
        (0, test_utils_1.submitOp)(
          conn,
          text_data_1.TEXTS_COLLECTION,
          (0, text_data_1.getTextDocId)('project01', 40, 1),
          new rich_text_1.Delta()
        )
      ).resolves.not.toThrow();
    }));
  it('does not allow non-member to view text', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'nonmember');
      yield expect(
        (0, test_utils_1.fetchDoc)(
          conn,
          text_data_1.TEXTS_COLLECTION,
          (0, text_data_1.getTextDocId)('project01', 40, 1)
        )
      ).rejects.toThrow();
    }));
  it('does not allow observer to edit text', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'observer');
      yield expect(
        (0, test_utils_1.submitOp)(
          conn,
          text_data_1.TEXTS_COLLECTION,
          (0, text_data_1.getTextDocId)('project01', 40, 1),
          new rich_text_1.Delta()
        )
      ).rejects.toThrow();
    }));
  it('writes the op source to the database', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'translator');
      const id = (0, text_data_1.getTextDocId)('project01', 40, 1);
      const source = 'history';
      yield (0, test_utils_1.submitOp)(conn, text_data_1.TEXTS_COLLECTION, id, new rich_text_1.Delta(), source);
      yield new Promise(resolve => {
        env.db.getOps(text_data_1.TEXTS_COLLECTION, id, 1, null, { metadata: true }, (_, ops) => {
          expect(ops[0].m.source).toBe(source);
          resolve();
        });
      });
    }));
  it('writes the op source to the database on create', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, 'administrator');
      const id = (0, text_data_1.getTextDocId)('project01', 40, 2);
      const source = 'history';
      yield (0, test_utils_1.createDoc)(
        conn,
        text_data_1.TEXTS_COLLECTION,
        id,
        new rich_text_1.Delta(),
        'rich-text',
        source
      );
      yield new Promise(resolve => {
        env.db.getOps(text_data_1.TEXTS_COLLECTION, id, 0, null, { metadata: true }, (_, ops) => {
          expect(ops[0].m.source).toBe(source);
          resolve();
        });
      });
    }));
});
class TestEnvironment {
  constructor() {
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.service = new text_service_1.TextService();
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
        'observer',
        (0, user_test_data_1.createTestUser)({}, 3)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        'nonmember',
        (0, user_test_data_1.createTestUser)({}, 4)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_1.SF_PROJECTS_COLLECTION,
        'project01',
        (0, sf_project_test_data_1.createTestProject)({
          userRoles: {
            administrator: sf_project_role_1.SFProjectRole.ParatextAdministrator,
            translator: sf_project_role_1.SFProjectRole.ParatextTranslator,
            observer: sf_project_role_1.SFProjectRole.ParatextObserver
          },
          paratextUsers: [
            { sfUserId: 'administrator', username: 'ptadministrator', opaqueUserId: 'opaqueadministrator' },
            { sfUserId: 'translator', username: 'pttranslator', opaqueUserId: 'opaquetranslator' }
          ]
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        text_data_1.TEXTS_COLLECTION,
        (0, text_data_1.getTextDocId)('project01', 40, 1),
        new rich_text_1.Delta(),
        'rich-text'
      );
    });
  }
}
//# sourceMappingURL=text-service.spec.js.map
