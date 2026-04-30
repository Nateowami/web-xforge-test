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
exports.USER_MIGRATIONS = void 0;
const realtime_server_1 = require('../../common/realtime-server');
const migration_1 = require('../migration');
class UserMigration1 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.roles == null) {
        if (doc.data.role != null) {
          ops.push({ p: ['role'], od: doc.data.role });
          ops.push({ p: ['roles'], oi: [doc.data.role] });
        } else {
          ops.push({ p: ['roles'], oi: [] });
        }
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(UserMigration1.VERSION, doc, ops);
      }
    });
  }
}
UserMigration1.VERSION = 1;
exports.USER_MIGRATIONS = (0, migration_1.monotonicallyIncreasingMigrationList)([UserMigration1]);
//# sourceMappingURL=user-migrations.js.map
