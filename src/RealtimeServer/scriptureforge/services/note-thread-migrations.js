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
exports.NOTE_THREAD_MIGRATIONS = void 0;
const migration_1 = require('../../common/migration');
const realtime_server_1 = require('../../common/realtime-server');
class NoteThreadMigration1 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      const tagIcon = doc.data.tagIcon;
      if (tagIcon != null) {
        ops.push({ p: ['tagIcon'], od: tagIcon });
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(NoteThreadMigration1.VERSION, doc, ops);
      }
    });
  }
}
NoteThreadMigration1.VERSION = 1;
class NoteThreadMigration2 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.notes == null) return;
      for (let i = 0; i < doc.data.notes.length; i++) {
        const extUserId = doc.data.notes[i].extUserId;
        if (extUserId != null) {
          ops.push({ p: ['notes', i, 'extUserId'], od: extUserId });
        }
        const tagIcon = doc.data.notes[i].tagIcon;
        if (tagIcon != null) {
          ops.push({ p: ['notes', i, 'tagIcon'], od: tagIcon });
        }
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(NoteThreadMigration2.VERSION, doc, ops);
      }
    });
  }
}
NoteThreadMigration2.VERSION = 2;
class NoteThreadMigration3 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.threadId != null) return;
      ops.push({ p: ['threadId'], oi: doc.data.dataId });
      yield (0, realtime_server_1.submitMigrationOp)(NoteThreadMigration2.VERSION, doc, ops);
    });
  }
}
NoteThreadMigration3.VERSION = 3;
class NoteThreadMigration4 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      const dataId = doc.data.dataId;
      if (dataId != null && dataId.substring(0, 3) === 'BT_' && doc.data.biblicalTermId == null) {
        ops.push({ p: ['biblicalTermId'], oi: dataId.substring(3) });
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(NoteThreadMigration3.VERSION, doc, ops);
      }
    });
  }
}
NoteThreadMigration4.VERSION = 4;
exports.NOTE_THREAD_MIGRATIONS = (0, migration_1.monotonicallyIncreasingMigrationList)([
  NoteThreadMigration1,
  NoteThreadMigration2,
  NoteThreadMigration3,
  NoteThreadMigration4
]);
//# sourceMappingURL=note-thread-migrations.js.map
