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
const realtime_server_1 = require('../../common/realtime-server');
const schema_version_repository_1 = require('../../common/schema-version-repository');
const test_utils_1 = require('../../common/utils/test-utils');
const sf_project_user_config_1 = require('../models/sf-project-user-config');
const sf_project_user_config_migrations_1 = require('./sf-project-user-config-migrations');
const sf_project_user_config_service_1 = require('./sf-project-user-config-service');
describe('SFProjectUserConfigMigrations', () => {
  describe('version 1', () => {
    it('adds numSuggestions property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(0);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01',
          {}
        );
        let userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.numSuggestions).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.numSuggestions).toEqual(1);
      }));
  });
  describe('version 2', () => {
    it('adds noteRefsRead property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(1);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01',
          {}
        );
        let userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.noteRefsRead).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.noteRefsRead).toEqual([]);
      }));
  });
  describe('version 3', () => {
    it('adds biblicalTermsEnabled and transliterateBiblicalTerms properties', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(2);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01',
          {}
        );
        let userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.biblicalTermsEnabled).not.toBeDefined();
        expect(userConfigDoc.data.transliterateBiblicalTerms).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.biblicalTermsEnabled).toEqual(true);
        expect(userConfigDoc.data.transliterateBiblicalTerms).toEqual(false);
      }));
  });
  describe('version 4', () => {
    it('adds audioRefsPlayed property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(3);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01',
          {}
        );
        let userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.audioRefsPlayed).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.audioRefsPlayed).toBeDefined();
      }));
  });
  describe('version 5', () => {
    it('deletes audioRefsPlayed property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(4);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01',
          { audioRefsPlayed: [] }
        );
        let userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.audioRefsPlayed).toBeDefined();
        yield env.server.migrateIfNecessary();
        userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.audioRefsPlayed).not.toBeDefined();
      }));
  });
  describe('version 6', () => {
    it('adds editorTabsOpen property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(5);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01',
          {}
        );
        let userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.editorTabsOpen).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.editorTabsOpen).toEqual([]);
      }));
  });
  describe('version 7', () => {
    it('does not modify the document', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(6);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01',
          {
            biblicalTermsEnabled: true
          }
        );
        let userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.version).toBe(1);
        yield env.server.migrateIfNecessary();
        userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.version).toBe(1);
      }));
  });
  describe('version 8', () => {
    it('adds lynxInsightState property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(7);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01',
          {}
        );
        let userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.lynxInsightState).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        userConfigDoc = yield (0, test_utils_1.fetchDoc)(
          conn,
          sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
          'project01:user01'
        );
        expect(userConfigDoc.data.lynxInsightState).toEqual({});
      }));
  });
});
class TestEnvironment {
  /**
   * @param startVersion The version the document is currently at (so migrations prior to this version will not be run
   * on the document)
   * @param endVersion The version the document should be migrated to
   */
  constructor(startVersion, endVersion = startVersion + 1) {
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    const ShareDBMingoType = (0, metadata_db_1.MetadataDB)(
      sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB)
    );
    this.db = new ShareDBMingoType();
    (0, ts_mockito_1.when)(this.mockedSchemaVersionRepository.getAll()).thenResolve([
      {
        _id: sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        collection: sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        version: startVersion
      }
    ]);
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      true,
      [
        new sf_project_user_config_service_1.SFProjectUserConfigService(
          sf_project_user_config_migrations_1.SF_PROJECT_USER_CONFIG_MIGRATIONS.filter(m => m.VERSION <= endVersion)
        )
      ],
      sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
  }
}
//# sourceMappingURL=sf-project-user-config-migrations.spec.js.map
