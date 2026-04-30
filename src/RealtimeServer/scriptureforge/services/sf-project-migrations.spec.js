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
const project_rights_1 = require('../../common/models/project-rights');
const realtime_server_1 = require('../../common/realtime-server');
const schema_version_repository_1 = require('../../common/schema-version-repository');
const test_utils_1 = require('../../common/utils/test-utils');
const sf_project_1 = require('../models/sf-project');
const sf_project_rights_1 = require('../models/sf-project-rights');
const sf_project_role_1 = require('../models/sf-project-role');
const text_info_permission_1 = require('../models/text-info-permission');
const sf_project_migrations_1 = require('./sf-project-migrations');
const sf_project_service_1 = require('./sf-project-service');
describe('SFProjectMigrations', () => {
  describe('version 1', () => {
    it('migrates docs', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(0);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          texts: [
            { bookNum: 40, chapters: [{ number: 1 }, { number: 2, isValid: true }] },
            { bookNum: 41, chapters: [{ number: 1 }, { number: 2 }] }
          ]
        });
        yield env.server.migrateIfNecessary();
        const projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.texts[0].chapters[0].isValid).toBe(true);
        expect(projectDoc.data.texts[0].chapters[1].isValid).toBe(true);
        expect(projectDoc.data.texts[1].chapters[0].isValid).toBe(true);
        expect(projectDoc.data.texts[1].chapters[1].isValid).toBe(true);
      }));
  });
  describe('version 2', () => {
    it('migrates docs', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(1);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          texts: [
            { bookNum: 40, chapters: [{ number: 1 }, { number: 2, isValid: true }], hasSource: true },
            { bookNum: 41, chapters: [{ number: 1 }, { number: 2, isValid: true }], hasSource: false }
          ],
          userRoles: {
            user01: sf_project_role_1.SFProjectRole.ParatextAdministrator,
            user02: sf_project_role_1.SFProjectRole.ParatextTranslator,
            user03: sf_project_role_1.SFProjectRole.ParatextConsultant,
            user04: sf_project_role_1.SFProjectRole.ParatextObserver
          }
        });
        yield env.server.migrateIfNecessary();
        const projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.texts[0].permissions['user01']).toBe(text_info_permission_1.TextInfoPermission.Write);
        expect(projectDoc.data.texts[0].permissions['user02']).toBe(text_info_permission_1.TextInfoPermission.Write);
        expect(projectDoc.data.texts[0].permissions['user03']).toBe(text_info_permission_1.TextInfoPermission.Read);
        expect(projectDoc.data.texts[0].permissions['user04']).toBe(text_info_permission_1.TextInfoPermission.Read);
        expect(Object.keys(projectDoc.data.texts[0].permissions).length).toBe(4);
        expect(projectDoc.data.texts[1].permissions['user01']).toBe(text_info_permission_1.TextInfoPermission.Write);
        expect(projectDoc.data.texts[1].permissions['user02']).toBe(text_info_permission_1.TextInfoPermission.Write);
        expect(projectDoc.data.texts[1].permissions['user03']).toBe(text_info_permission_1.TextInfoPermission.Read);
        expect(projectDoc.data.texts[1].permissions['user04']).toBe(text_info_permission_1.TextInfoPermission.Read);
        expect(Object.keys(projectDoc.data.texts[1].permissions).length).toBe(4);
      }));
  });
  describe('version 3', () => {
    it('migrates docs', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(1, 3);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          texts: [
            { bookNum: 40, chapters: [{ number: 1 }, { number: 2, isValid: true }], hasSource: true },
            { bookNum: 41, chapters: [{ number: 1 }, { number: 2, isValid: true }], hasSource: false }
          ],
          userRoles: {
            user01: sf_project_role_1.SFProjectRole.ParatextAdministrator,
            user02: sf_project_role_1.SFProjectRole.ParatextTranslator,
            user03: sf_project_role_1.SFProjectRole.ParatextConsultant,
            user04: sf_project_role_1.SFProjectRole.ParatextObserver
          }
        });
        yield env.server.migrateIfNecessary();
        const projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.texts[0].chapters[0].permissions['user01']).toBe(
          text_info_permission_1.TextInfoPermission.Write
        );
        expect(projectDoc.data.texts[0].chapters[0].permissions['user02']).toBe(
          text_info_permission_1.TextInfoPermission.Write
        );
        expect(projectDoc.data.texts[0].chapters[0].permissions['user03']).toBe(
          text_info_permission_1.TextInfoPermission.Read
        );
        expect(projectDoc.data.texts[0].chapters[0].permissions['user04']).toBe(
          text_info_permission_1.TextInfoPermission.Read
        );
        expect(Object.keys(projectDoc.data.texts[0].chapters[0].permissions).length).toBe(4);
        expect(projectDoc.data.texts[0].chapters[1].permissions['user01']).toBe(
          text_info_permission_1.TextInfoPermission.Write
        );
        expect(projectDoc.data.texts[0].chapters[1].permissions['user02']).toBe(
          text_info_permission_1.TextInfoPermission.Write
        );
        expect(projectDoc.data.texts[0].chapters[1].permissions['user03']).toBe(
          text_info_permission_1.TextInfoPermission.Read
        );
        expect(projectDoc.data.texts[0].chapters[1].permissions['user04']).toBe(
          text_info_permission_1.TextInfoPermission.Read
        );
        expect(Object.keys(projectDoc.data.texts[1].permissions).length).toBe(4);
        expect(projectDoc.data.texts[1].chapters[0].permissions['user01']).toBe(
          text_info_permission_1.TextInfoPermission.Write
        );
        expect(projectDoc.data.texts[1].chapters[0].permissions['user02']).toBe(
          text_info_permission_1.TextInfoPermission.Write
        );
        expect(projectDoc.data.texts[1].chapters[0].permissions['user03']).toBe(
          text_info_permission_1.TextInfoPermission.Read
        );
        expect(projectDoc.data.texts[1].chapters[0].permissions['user04']).toBe(
          text_info_permission_1.TextInfoPermission.Read
        );
        expect(Object.keys(projectDoc.data.texts[1].chapters[0].permissions).length).toBe(4);
        expect(projectDoc.data.texts[1].chapters[1].permissions['user01']).toBe(
          text_info_permission_1.TextInfoPermission.Write
        );
        expect(projectDoc.data.texts[1].chapters[1].permissions['user02']).toBe(
          text_info_permission_1.TextInfoPermission.Write
        );
        expect(projectDoc.data.texts[1].chapters[1].permissions['user03']).toBe(
          text_info_permission_1.TextInfoPermission.Read
        );
        expect(projectDoc.data.texts[1].chapters[1].permissions['user04']).toBe(
          text_info_permission_1.TextInfoPermission.Read
        );
        expect(Object.keys(projectDoc.data.texts[1].chapters[1].permissions).length).toBe(4);
      }));
  });
  describe('version 4', () => {
    it('adds userPermissions property to project docs', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(3);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {});
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.userPermissions).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.userPermissions).toBeDefined();
      }));
  });
  describe('version 5', () => {
    it('adds shareEnabled to translate config', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(4);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { translationSuggestionsEnabled: false }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.shareEnabled).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.shareEnabled).toBe(false);
      }));
  });
  describe('version 6', () => {
    it('adds editable property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(5);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {});
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.editable).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.editable).toBe(true);
      }));
  });
  describe('version 7', () => {
    it('moves tag icon to translateConfig class', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(6);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          tagIcon: '01flag1',
          translateConfig: {}
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.tagIcon).toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.tagIcon).toBeUndefined();
      }));
  });
  describe('version 8', () => {
    it('removes percentCompleted from project doc', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(7);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          sync: { percentCompleted: 1 }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.sync.percentCompleted).toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.sync.percentCompleted).not.toBeDefined();
      }));
  });
  describe('version 9', () => {
    it('removes shareLevel from translate and checking config', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(8);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { shareLevel: 'anyone' },
          checkingConfig: { shareLevel: 'anyone' }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.shareLevel).toBeDefined();
        expect(projectDoc.data.checkingConfig.shareLevel).toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.shareLevel).not.toBeDefined();
        expect(projectDoc.data.checkingConfig.shareLevel).not.toBeDefined();
      }));
  });
  describe('version 10', () => {
    it('adds preTranslate to translate config', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(9);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { translationSuggestionsEnabled: false }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.preTranslate).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.preTranslate).toBe(false);
      }));
  });
  describe('version 11', () => {
    it('adds biblical terms properties', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(10);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {});
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.biblicalTermsConfig).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.biblicalTermsConfig.biblicalTermsEnabled).toBe(false);
        expect(projectDoc.data.biblicalTermsConfig.hasRenderings).toBe(false);
      }));
  });
  describe('version 12', () => {
    it('adds draftConfig to translateConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(11);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {}
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig).toBeDefined();
      }));
  });
  describe('version 13', () => {
    it('adds lastSelectedBooks to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(12);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedBooks).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedBooks).toBeDefined();
      }));
  });
  describe('version 14', () => {
    it('adds alternateTrainingSourceEnabled to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(13);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { lastSelectedBooks: [] } }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled).toBe(false);
      }));
    it('adds lastSelectedTrainingBooks to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(13);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingBooks).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingBooks).toEqual([]);
      }));
    it('adds lastSelectedTranslationBooks to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(13);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationBooks).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationBooks).toEqual([]);
      }));
    it('migrates lastSelectedBooks to lastSelectedTrainingBooks', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(13);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { lastSelectedBooks: [1, 2, 3] } }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingBooks).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedBooks).not.toBeDefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingBooks).toEqual([1, 2, 3]);
      }));
  });
  describe('version 15', () => {
    it('adds create resolve property to note tag', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(14);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          noteTags: [{ tagId: 1, name: 'Tag 01', icon: '01flag1', creatorResolve: false }]
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.noteTags[0].creatorResolve).toBe(false);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.noteTags[0].creatorResolve).toBe(true);
      }));
  });
  describe('version 16', () => {
    it('adds sendAllSegments to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(15);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.sendAllSegments).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.sendAllSegments).toBe(false);
      }));
  });
  describe('version 17', () => {
    it('adds lastSelectedTrainingDataFiles to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(16);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingDataFiles).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingDataFiles).toBeDefined();
      }));
    it('adds additionalTrainingData to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(16);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingData).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingData).toBe(false);
      }));
  });
  describe('version 18', () => {
    it('adds alternateSourceEnabled to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(17);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).toBe(false);
      }));
    it('sets alternateSourceEnabled to true when an alternate source is present', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(17);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { alternateSource: { projectRef: 'project02' } } }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).toBe(true);
      }));
  });
  describe('version 19', () => {
    it('removes sendAllSegments from draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(18);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { sendAllSegments: false } }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.sendAllSegments).toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.sendAllSegments).toBeUndefined();
      }));
  });
  describe('version 20', () => {
    it('adds additionalTrainingSourceEnabled to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(19);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingSourceEnabled).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingSourceEnabled).toBe(false);
      }));
  });
  describe('version 21', () => {
    it('does not change rolePermissions if it already exists', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(20);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          rolePermissions: {}
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.rolePermissions).toEqual({});
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.rolePermissions).toEqual({});
      }));
    it('does not add permissions if shareEnabled is false for checkingConfig and translateConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(20);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          checkingConfig: { shareEnabled: false },
          translateConfig: { shareEnabled: false }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.rolePermissions).toBeUndefined();
        expect(projectDoc.data.checkingConfig.shareEnabled).toBe(false);
        expect(projectDoc.data.translateConfig.shareEnabled).toBe(false);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.rolePermissions).toEqual({});
        expect(projectDoc.data.checkingConfig.shareEnabled).not.toBeDefined();
        expect(projectDoc.data.translateConfig.shareEnabled).not.toBeDefined();
      }));
    it('adds permissions if shareEnabled is true for checkingConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(20);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          checkingConfig: { shareEnabled: true },
          translateConfig: { shareEnabled: false }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.rolePermissions).toBeUndefined();
        expect(projectDoc.data.checkingConfig.shareEnabled).toBe(true);
        expect(projectDoc.data.translateConfig.shareEnabled).toBe(false);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        const permissions = [
          sf_project_rights_1.SF_PROJECT_RIGHTS.joinRight(
            sf_project_rights_1.SFProjectDomain.UserInvites,
            project_rights_1.Operation.Create
          )
        ];
        expect(projectDoc.data.rolePermissions).toEqual({
          sf_community_checker: permissions
        });
        expect(projectDoc.data.checkingConfig.shareEnabled).not.toBeDefined();
        expect(projectDoc.data.translateConfig.shareEnabled).not.toBeDefined();
      }));
    it('adds permissions if shareEnabled is true for translateConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(20);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          checkingConfig: { shareEnabled: false },
          translateConfig: { shareEnabled: true }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.rolePermissions).toBeUndefined();
        expect(projectDoc.data.checkingConfig.shareEnabled).toBe(false);
        expect(projectDoc.data.translateConfig.shareEnabled).toBe(true);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        const permissions = [
          sf_project_rights_1.SF_PROJECT_RIGHTS.joinRight(
            sf_project_rights_1.SFProjectDomain.UserInvites,
            project_rights_1.Operation.Create
          )
        ];
        expect(projectDoc.data.rolePermissions).toEqual({
          sf_commenter: permissions,
          sf_observer: permissions
        });
        expect(projectDoc.data.checkingConfig.shareEnabled).not.toBeDefined();
        expect(projectDoc.data.translateConfig.shareEnabled).not.toBeDefined();
      }));
    it('adds permissions if shareEnabled is true for checkingConfig and translateConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(20);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          checkingConfig: { shareEnabled: true },
          translateConfig: { shareEnabled: true }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.rolePermissions).toBeUndefined();
        expect(projectDoc.data.checkingConfig.shareEnabled).toBe(true);
        expect(projectDoc.data.translateConfig.shareEnabled).toBe(true);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        const permissions = [
          sf_project_rights_1.SF_PROJECT_RIGHTS.joinRight(
            sf_project_rights_1.SFProjectDomain.UserInvites,
            project_rights_1.Operation.Create
          )
        ];
        expect(projectDoc.data.rolePermissions).toEqual({
          sf_community_checker: permissions,
          sf_commenter: permissions,
          sf_observer: permissions
        });
        expect(projectDoc.data.checkingConfig.shareEnabled).not.toBeDefined();
        expect(projectDoc.data.translateConfig.shareEnabled).not.toBeDefined();
      }));
  });
  describe('version 22', () => {
    it('copies selected training and translation books to scripture ranges', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(21);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: { lastSelectedTrainingBooks: [1, 2, 3], lastSelectedTranslationBooks: [4, 5] }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingBooks).toEqual([1, 2, 3]);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationBooks).toEqual([4, 5]);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingBooks).toEqual([1, 2, 3]);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationBooks).toEqual([4, 5]);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toEqual('GEN;EXO;LEV');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toEqual('NUM;DEU');
      }));
  });
  describe('version 23', () => {
    it('removes obsolete usfm config', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(22);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { usfmConfig: { preserveParagraphMarkers: true } } }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.usfmConfig.preserveParagraphMarkers).toBe(true);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.usfmConfig).toBeUndefined();
      }));
  });
  describe('version 24', () => {
    it('removes additionalTrainingData from draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(23);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { additionalTrainingData: true } }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingData).toBe(true);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingData).toBeUndefined();
      }));
  });
  describe('version 25', () => {
    it('adds lynxConfig with default values', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(24);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {});
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.lynxConfig).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.lynxConfig).toEqual({
          autoCorrectionsEnabled: false,
          assessmentsEnabled: false,
          punctuationCheckerEnabled: false,
          allowedCharacterCheckerEnabled: false
        });
      }));
  });
  describe('version 26', () => {
    it('removes lastSelectedTrainingBooks from draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { lastSelectedTrainingBooks: [40] } }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingBooks).toEqual([40]);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingBooks).toBeUndefined();
      }));
    it('removes lastSelectedTranslationBooks from draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { lastSelectedTranslationBooks: [41] } }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationBooks).toEqual([41]);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationBooks).toBeUndefined();
      }));
    it('removes lastSelectedTrainingScriptureRange if lastSelectedTrainingScriptureRanges exists', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: {
              lastSelectedTrainingScriptureRange: 'GEN',
              lastSelectedTrainingScriptureRanges: [{ scriptureRange: 'GEN;EXO' }]
            }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toEqual('GEN');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRanges).toEqual([
          { scriptureRange: 'GEN;EXO' }
        ]);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRanges).toEqual([
          { scriptureRange: 'GEN;EXO' }
        ]);
      }));
    it('removes lastSelectedTranslationScriptureRange if lastSelectedTranslationScriptureRanges exists', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: {
              lastSelectedTranslationScriptureRange: 'GEN',
              lastSelectedTranslationScriptureRanges: [{ scriptureRange: 'GEN;EXO' }]
            }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toEqual('GEN');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRanges).toEqual([
          { scriptureRange: 'GEN;EXO' }
        ]);
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRanges).toEqual([
          { scriptureRange: 'GEN;EXO' }
        ]);
      }));
    it('migrates lastSelectedTrainingScriptureRange with alternate training source enabled', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: {
              lastSelectedTrainingScriptureRange: 'GEN',
              lastSelectedTrainingScriptureRanges: [],
              alternateTrainingSource: { projectRef: 'project02' },
              alternateTrainingSourceEnabled: true
            }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSource.projectRef).toEqual('project02');
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled).toBe(true);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toEqual('GEN');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRanges).toEqual([]);
        expect(projectDoc.data.translateConfig.source).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRanges).toEqual([
          { projectId: 'project02', scriptureRange: 'GEN' }
        ]);
      }));
    it('migrates lastSelectedTrainingScriptureRange with alternate training source disabled', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: {
              lastSelectedTrainingScriptureRange: 'GEN',
              alternateTrainingSource: { projectRef: 'project02' },
              alternateTrainingSourceEnabled: false
            },
            source: { projectRef: 'project03' }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSource.projectRef).toEqual('project02');
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled).toBe(false);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toEqual('GEN');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRanges).toBeUndefined();
        expect(projectDoc.data.translateConfig.source.projectRef).toEqual('project03');
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRanges).toEqual([
          { projectId: 'project03', scriptureRange: 'GEN' }
        ]);
      }));
    it('migrates lastSelectedTrainingScriptureRange with alternate training source undefined', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: {
              lastSelectedTrainingScriptureRange: 'GEN',
              alternateTrainingSource: null,
              alternateTrainingSourceEnabled: true
            },
            source: { projectRef: 'project03' }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSource).toBeNull();
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled).toBe(true);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toEqual('GEN');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRanges).toBeUndefined();
        expect(projectDoc.data.translateConfig.source.projectRef).toEqual('project03');
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRanges).toEqual([
          { projectId: 'project03', scriptureRange: 'GEN' }
        ]);
      }));
    it('migrates lastSelectedTranslationScriptureRange with alternate source enabled', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: {
              lastSelectedTranslationScriptureRange: 'GEN',
              lastSelectedTranslationScriptureRanges: [],
              alternateSource: { projectRef: 'project02' },
              alternateSourceEnabled: true
            }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSource.projectRef).toEqual('project02');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).toBe(true);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toEqual('GEN');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRanges).toEqual([]);
        expect(projectDoc.data.translateConfig.source).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRanges).toEqual([
          { projectId: 'project02', scriptureRange: 'GEN' }
        ]);
      }));
    it('migrates lastSelectedTranslationScriptureRange with alternate source disabled', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: {
              lastSelectedTranslationScriptureRange: 'GEN',
              alternateSource: { projectRef: 'project02' },
              alternateSourceEnabled: false
            },
            source: { projectRef: 'project03' }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSource.projectRef).toEqual('project02');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).toBe(false);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toEqual('GEN');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRanges).toBeUndefined();
        expect(projectDoc.data.translateConfig.source.projectRef).toEqual('project03');
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRanges).toEqual([
          { projectId: 'project03', scriptureRange: 'GEN' }
        ]);
      }));
    it('migrates lastSelectedTranslationScriptureRange with alternate source undefined', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(25);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            draftConfig: {
              lastSelectedTranslationScriptureRange: 'GEN',
              alternateSource: null,
              alternateSourceEnabled: true
            },
            source: { projectRef: 'project03' }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.alternateSource).toBeNull();
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).toBe(true);
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toEqual('GEN');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRanges).toBeUndefined();
        expect(projectDoc.data.translateConfig.source.projectRef).toEqual('project03');
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRanges).toEqual([
          { projectId: 'project03', scriptureRange: 'GEN' }
        ]);
      }));
  });
  describe('version 27', () => {
    it('adds empty arrays if preTranslate is false', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(26);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { preTranslate: false, draftConfig: {} }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toEqual([]);
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toEqual([]);
      }));
    it('adds empty arrays if preTranslate is true but sources were disabled', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(26);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            preTranslate: true,
            draftConfig: {
              alternateTrainingSource: { projectRef: 'project02' },
              alternateTrainingSourceEnabled: false,
              alternateSource: { projectRef: 'project03' },
              alternateSourceEnabled: false,
              additionalTrainingSource: { projectRef: 'project04' },
              additionalTrainingSourceEnabled: false
            }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toEqual([]);
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toEqual([]);
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingSourceEnabled).toBeUndefined();
      }));
    it('adds empty arrays if preTranslate is true and sources are enabled but undefined', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(26);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            preTranslate: true,
            draftConfig: {
              alternateTrainingSourceEnabled: true,
              alternateSourceEnabled: true,
              additionalTrainingSourceEnabled: true
            }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toEqual([]);
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toEqual([]);
      }));
    it('adds source to both arrays if preTranslate is true but sources were disabled', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(26);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            preTranslate: true,
            draftConfig: {
              alternateTrainingSource: { projectRef: 'project02' },
              alternateTrainingSourceEnabled: false,
              alternateSource: { projectRef: 'project03' },
              alternateSourceEnabled: false,
              additionalTrainingSource: { projectRef: 'project04' },
              additionalTrainingSourceEnabled: false
            },
            source: { projectRef: 'project05' }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toEqual([{ projectRef: 'project05' }]);
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toEqual([{ projectRef: 'project05' }]);
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingSourceEnabled).toBeUndefined();
      }));
    it('adds sources to the appropriate arrays if preTranslate is true and sources are configured', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(26);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: {
            preTranslate: true,
            draftConfig: {
              alternateTrainingSource: { projectRef: 'project02' },
              alternateTrainingSourceEnabled: true,
              alternateSource: { projectRef: 'project03' },
              alternateSourceEnabled: true,
              additionalTrainingSource: { projectRef: 'project04' },
              additionalTrainingSourceEnabled: true
            },
            source: { projectRef: 'project05' }
          }
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toBeUndefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.draftingSources).toEqual([{ projectRef: 'project03' }]);
        expect(projectDoc.data.translateConfig.draftConfig.trainingSources).toEqual([
          { projectRef: 'project02' },
          { projectRef: 'project04' }
        ]);
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.alternateSourceEnabled).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingSource).toBeUndefined();
        expect(projectDoc.data.translateConfig.draftConfig.additionalTrainingSourceEnabled).toBeUndefined();
      }));
  });
  describe('version 28', () => {
    it('adds currentScriptureRange to draftConfig', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(27);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} },
          texts: [
            { bookNum: 1, chapters: [{ hasDraft: true }] },
            { bookNum: 2, chapters: [{ hasDraft: false }] },
            { bookNum: 3, chapters: [{ hasDraft: true }] },
            { bookNum: 0, chapters: [{ hasDraft: true }] }
          ]
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).not.toBeDefined();
        expect(projectDoc.data.translateConfig.draftConfig.draftedScriptureRange).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).toBe('GEN;LEV');
        expect(projectDoc.data.translateConfig.draftConfig.draftedScriptureRange).toBe('GEN;LEV');
      }));
    it('does not add currentScriptureRange to draftConfig if it exists', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(27);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { currentScriptureRange: 'NUM;DEU' } },
          texts: [
            { bookNum: 1, chapters: [{ hasDraft: true }] },
            { bookNum: 2, chapters: [{ hasDraft: false }] },
            { bookNum: 3, chapters: [{ hasDraft: true }] },
            { bookNum: 0, chapters: [{ hasDraft: true }] }
          ]
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).toBe('NUM;DEU');
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).toBe('NUM;DEU');
      }));
    it('does not add draftedScriptureRange to draftConfig if it exists', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(27);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: { draftedScriptureRange: 'NUM;DEU' } },
          texts: [
            { bookNum: 1, chapters: [{ hasDraft: true }] },
            { bookNum: 2, chapters: [{ hasDraft: false }] },
            { bookNum: 3, chapters: [{ hasDraft: true }] },
            { bookNum: 0, chapters: [{ hasDraft: true }] }
          ]
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).not.toBeDefined();
        expect(projectDoc.data.translateConfig.draftConfig.draftedScriptureRange).toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).toBe('GEN;LEV');
        expect(projectDoc.data.translateConfig.draftConfig.draftedScriptureRange).toBe('NUM;DEU');
      }));
    it('does not add currentScriptureRange to draftConfig if no drafted chapters', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(27);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} },
          texts: [
            { bookNum: 1, chapters: [{ hasDraft: false }] },
            { bookNum: 2, chapters: [{ hasDraft: false }] }
          ]
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).not.toBeDefined();
      }));
    it('does not add currentScriptureRange to draftConfig if there are no texts', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(27);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', {
          translateConfig: { draftConfig: {} },
          texts: []
        });
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(projectDoc.data.translateConfig.draftConfig.currentScriptureRange).not.toBeDefined();
      }));
    it('does not add currentScriptureRange to draftConfig if the project is null', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        const env = new TestEnvironment(27);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01', null);
        let projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(
          (_c =
            (_b = (_a = projectDoc.data) === null || _a === void 0 ? void 0 : _a.translateConfig) === null ||
            _b === void 0
              ? void 0
              : _b.draftConfig) === null || _c === void 0
            ? void 0
            : _c.currentScriptureRange
        ).not.toBeDefined();
        yield env.server.migrateIfNecessary();
        projectDoc = yield (0, test_utils_1.fetchDoc)(conn, sf_project_1.SF_PROJECTS_COLLECTION, 'project01');
        expect(
          (_f =
            (_e = (_d = projectDoc.data) === null || _d === void 0 ? void 0 : _d.translateConfig) === null ||
            _e === void 0
              ? void 0
              : _e.draftConfig) === null || _f === void 0
            ? void 0
            : _f.currentScriptureRange
        ).not.toBeDefined();
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
        _id: sf_project_1.SF_PROJECTS_COLLECTION,
        collection: sf_project_1.SF_PROJECTS_COLLECTION,
        version: startVersion
      }
    ]);
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      true,
      [
        new sf_project_service_1.SFProjectService(
          sf_project_migrations_1.SF_PROJECT_MIGRATIONS.filter(m => m.VERSION <= endVersion)
        )
      ],
      sf_project_1.SF_PROJECTS_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
  }
}
//# sourceMappingURL=sf-project-migrations.spec.js.map
