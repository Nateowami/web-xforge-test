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
Object.defineProperty(exports, '__esModule', { value: true });
exports.QUESTION_MIGRATIONS = void 0;
const migration_1 = require('../../common/migration');
const realtime_server_1 = require('../../common/realtime-server');
class QuestionMigration1 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      for (let i = 0; i < doc.data.answers.length; i++) {
        if (doc.data.answers[i].deleted == null) {
          ops.push({ p: ['answers', i, 'deleted'], oi: false });
        }
        for (let j = 0; j < doc.data.answers[i].comments.length; j++) {
          if (doc.data.answers[i].comments[j].deleted == null) {
            ops.push({ p: ['answers', i, 'comments', j, 'deleted'], oi: false });
          }
        }
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(QuestionMigration1.VERSION, doc, ops);
      }
    });
  }
}
QuestionMigration1.VERSION = 1;
exports.QUESTION_MIGRATIONS = (0, migration_1.monotonicallyIncreasingMigrationList)([QuestionMigration1]);
//# sourceMappingURL=question-migrations.js.map
