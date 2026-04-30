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
const question_1 = require('../models/question');
const question_service_1 = require('./question-service');
describe('QuestionMigrations', () => {
  describe('version 1', () => {
    it('migrates docs', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment(0);
        const conn = env.server.connect();
        yield (0, test_utils_1.createDoc)(conn, question_1.QUESTIONS_COLLECTION, 'question01', {
          answers: [{ deleted: true, comments: [{}, { deleted: true }] }, { comments: [{}, {}] }]
        });
        yield (0, test_utils_1.createDoc)(conn, question_1.QUESTIONS_COLLECTION, 'question02', {
          answers: []
        });
        yield env.server.migrateIfNecessary();
        let questionDoc = yield (0, test_utils_1.fetchDoc)(conn, question_1.QUESTIONS_COLLECTION, 'question01');
        expect(questionDoc.data.answers[0].deleted).toBe(true);
        expect(questionDoc.data.answers[0].comments[0].deleted).toBe(false);
        expect(questionDoc.data.answers[0].comments[1].deleted).toBe(true);
        expect(questionDoc.data.answers[1].deleted).toBe(false);
        expect(questionDoc.data.answers[1].comments[0].deleted).toBe(false);
        expect(questionDoc.data.answers[1].comments[1].deleted).toBe(false);
        questionDoc = yield (0, test_utils_1.fetchDoc)(conn, question_1.QUESTIONS_COLLECTION, 'question02');
        expect(questionDoc.data.answers.length).toBe(0);
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
      { _id: question_1.QUESTIONS_COLLECTION, collection: question_1.QUESTIONS_COLLECTION, version }
    ]);
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      true,
      [new question_service_1.QuestionService()],
      question_1.QUESTIONS_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
  }
}
//# sourceMappingURL=question-migrations.spec.js.map
