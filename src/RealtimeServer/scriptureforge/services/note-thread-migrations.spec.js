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
const note_thread_1 = require('../models/note-thread');
const note_thread_service_1 = require('./note-thread-service');
describe('NoteThreadMigrations', () => {
  describe('version 1', () => {
    it('removes note thread icon', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(0);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01', {
          threadId: 'thread01',
          tagIcon: '01flag1'
        });
        yield env.server.migrateIfNecessary();
        const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01');
        expect(doc.data.tagIcon).toBeUndefined();
      }));
  });
  describe('version 2', () => {
    it('removes ext user and tag icon property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(1);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01', {
          threadId: 'thread01',
          notes: [{ threadId: 'thread01', tagIcon: '01flag1', extUserId: 'user02' }]
        });
        yield env.server.migrateIfNecessary();
        const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01');
        expect(doc.data.notes[0].extUserId).toBeUndefined();
        expect(doc.data.notes[0].tagIcon).toBeUndefined();
      }));
  });
  describe('version 3', () => {
    it('copies data id value to new thread id property', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(2);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01', {
          dataId: 'thread01'
        });
        yield env.server.migrateIfNecessary();
        const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01');
        expect(doc.data.threadId).toEqual('thread01');
      }));
  });
  describe('version 4', () => {
    it('sets the biblical term id if the note is for a biblical term', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(3);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01', {
          dataId: 'BT_מַשָּׂא-1'
        });
        yield env.server.migrateIfNecessary();
        const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01');
        expect(doc.data.biblicalTermId).toBe('מַשָּׂא-1');
      }));
    it('does not set the biblical term id for notes that are not for biblical terms', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(2);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01', {
          dataId: 'dataId01'
        });
        yield env.server.migrateIfNecessary();
        const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, 'project01:thread01');
        expect(doc.data.biblicalTermId).toBeUndefined();
      }));
  });
});
class TestEnvironment {
  constructor(version) {
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    const ShareDBMingoType = (0, metadata_db_1.MetadataDB)(
      sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB)
    );
    this.db = new ShareDBMingoType();
    (0, ts_mockito_1.when)(this.mockedSchemaVersionRepository.getAll()).thenResolve([
      { _id: note_thread_1.NOTE_THREAD_COLLECTION, collection: note_thread_1.NOTE_THREAD_COLLECTION, version }
    ]);
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      true,
      [new note_thread_service_1.NoteThreadService()],
      note_thread_1.NOTE_THREAD_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
  }
}
//# sourceMappingURL=note-thread-migrations.spec.js.map
