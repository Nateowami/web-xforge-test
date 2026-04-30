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
exports.SF_PROJECT_USER_CONFIG_MIGRATIONS = void 0;
const migration_1 = require('../../common/migration');
const realtime_server_1 = require('../../common/realtime-server');
class SFProjectUserConfigMigration1 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      if (doc.data.numSuggestions === undefined) {
        const op = { p: ['numSuggestions'], oi: 1 };
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectUserConfigMigration1.VERSION, doc, [op]);
      }
    });
  }
}
SFProjectUserConfigMigration1.VERSION = 1;
class SFProjectUserConfigMigration2 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      if (doc.data.noteRefsRead === undefined) {
        const op = { p: ['noteRefsRead'], oi: [] };
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectUserConfigMigration1.VERSION, doc, [op]);
      }
    });
  }
}
SFProjectUserConfigMigration2.VERSION = 2;
class SFProjectUserConfigMigration3 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.biblicalTermsEnabled === undefined) {
        const op = { p: ['biblicalTermsEnabled'], oi: true };
        ops.push(op);
      }
      if (doc.data.transliterateBiblicalTerms === undefined) {
        const op = { p: ['transliterateBiblicalTerms'], oi: false };
        ops.push(op);
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectUserConfigMigration3.VERSION, doc, ops);
    });
  }
}
SFProjectUserConfigMigration3.VERSION = 3;
class SFProjectUserConfigMigration4 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      if (doc.data.audioRefsPlayed === undefined) {
        const op = { p: ['audioRefsPlayed'], oi: [] };
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectUserConfigMigration4.VERSION, doc, [op]);
      }
    });
  }
}
SFProjectUserConfigMigration4.VERSION = 4;
class SFProjectUserConfigMigration5 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const audioRefsPlayed = doc.data.audioRefsPlayed;
      if (audioRefsPlayed !== undefined) {
        const op = { p: ['audioRefsPlayed'], od: audioRefsPlayed };
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectUserConfigMigration5.VERSION, doc, [op]);
      }
    });
  }
}
SFProjectUserConfigMigration5.VERSION = 5;
class SFProjectUserConfigMigration6 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      if (doc.data.editorTabsOpen === undefined) {
        const op = { p: ['editorTabsOpen'], oi: [] };
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectUserConfigMigration6.VERSION, doc, [op]);
      }
    });
  }
}
SFProjectUserConfigMigration6.VERSION = 6;
class SFProjectUserConfigMigration7 extends migration_1.DocMigration {
  migrateDoc(_) {
    return __awaiter(this, void 0, void 0, function* () {
      // This migration has been removed.
      // The migration that was here added the Biblical Terms tab, and removed the setting from project-user-config.
      // This migration was run on QA but not live.
    });
  }
}
SFProjectUserConfigMigration7.VERSION = 7;
class SFProjectUserConfigMigration8 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      if (doc.data.lynxInsightState === undefined) {
        const op = { p: ['lynxInsightState'], oi: {} };
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectUserConfigMigration8.VERSION, doc, [op]);
      }
    });
  }
}
SFProjectUserConfigMigration8.VERSION = 8;
exports.SF_PROJECT_USER_CONFIG_MIGRATIONS = (0, migration_1.monotonicallyIncreasingMigrationList)([
  SFProjectUserConfigMigration1,
  SFProjectUserConfigMigration2,
  SFProjectUserConfigMigration3,
  SFProjectUserConfigMigration4,
  SFProjectUserConfigMigration5,
  SFProjectUserConfigMigration6,
  SFProjectUserConfigMigration7,
  SFProjectUserConfigMigration8
]);
//# sourceMappingURL=sf-project-user-config-migrations.js.map
