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
exports.SF_PROJECT_MIGRATIONS = void 0;
const scripture_1 = require('@sillsdev/scripture');
const migration_1 = require('../../common/migration');
const project_rights_1 = require('../../common/models/project-rights');
const realtime_server_1 = require('../../common/realtime-server');
const sf_project_rights_1 = require('../models/sf-project-rights');
const sf_project_role_1 = require('../models/sf-project-role');
const text_info_permission_1 = require('../models/text-info-permission');
const translate_config_1 = require('../models/translate-config');
class SFProjectMigration1 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      for (let i = 0; i < doc.data.texts.length; i++) {
        for (let j = 0; j < doc.data.texts[i].chapters.length; j++) {
          const chapter = doc.data.texts[i].chapters[j];
          if (chapter.isValid === undefined) {
            ops.push({ p: ['texts', i, 'chapters', j, 'isValid'], oi: true });
          }
        }
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration1.VERSION, doc, ops);
      }
    });
  }
}
SFProjectMigration1.VERSION = 1;
class SFProjectMigration2 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      for (let i = 0; i < doc.data.texts.length; i++) {
        // Create default book permissions
        if (doc.data.texts[i].permissions === undefined) {
          const permissions = {};
          for (const userId in doc.data.userRoles) {
            if (Object.prototype.hasOwnProperty.call(doc.data.userRoles, userId)) {
              if (
                doc.data.userRoles[userId] === sf_project_role_1.SFProjectRole.ParatextTranslator ||
                doc.data.userRoles[userId] === sf_project_role_1.SFProjectRole.ParatextAdministrator
              ) {
                permissions[userId] = text_info_permission_1.TextInfoPermission.Write;
              } else {
                permissions[userId] = text_info_permission_1.TextInfoPermission.Read;
              }
            }
          }
          ops.push({ p: ['texts', i, 'permissions'], oi: permissions });
        }
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration2.VERSION, doc, ops);
      }
    });
  }
}
SFProjectMigration2.VERSION = 2;
class SFProjectMigration3 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      for (let i = 0; i < doc.data.texts.length; i++) {
        // Create default chapter permissions
        for (let j = 0; j < doc.data.texts[i].chapters.length; j++) {
          if (doc.data.texts[i].chapters[j].permissions === undefined) {
            const permissions = {};
            for (const userId in doc.data.userRoles) {
              if (Object.prototype.hasOwnProperty.call(doc.data.userRoles, userId)) {
                if (
                  doc.data.userRoles[userId] === sf_project_role_1.SFProjectRole.ParatextTranslator ||
                  doc.data.userRoles[userId] === sf_project_role_1.SFProjectRole.ParatextAdministrator
                ) {
                  permissions[userId] = text_info_permission_1.TextInfoPermission.Write;
                } else {
                  permissions[userId] = text_info_permission_1.TextInfoPermission.Read;
                }
              }
            }
            ops.push({ p: ['texts', i, 'chapters', j, 'permissions'], oi: permissions });
          }
        }
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration3.VERSION, doc, ops);
      }
    });
  }
}
SFProjectMigration3.VERSION = 3;
class SFProjectMigration4 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [{ p: ['userPermissions'], oi: {} }];
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration4.VERSION, doc, ops);
    });
  }
}
SFProjectMigration4.VERSION = 4;
class SFProjectMigration5 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig == null) {
        ops.push({ p: ['translateConfig'], oi: {} });
      }
      ops.push({ p: ['translateConfig', 'shareEnabled'], oi: false });
      ops.push({ p: ['translateConfig', 'shareLevel'], oi: translate_config_1.TranslateShareLevel.Specific });
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration5.VERSION, doc, ops);
    });
  }
}
SFProjectMigration5.VERSION = 5;
class SFProjectMigration6 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.editable == null) {
        ops.push({ p: ['editable'], oi: true });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration6.VERSION, doc, ops);
    });
  }
}
SFProjectMigration6.VERSION = 6;
class SFProjectMigration7 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      const tagIcon = doc.data.tagIcon;
      if (tagIcon != null) {
        ops.push({ p: ['tagIcon'], od: tagIcon });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration7.VERSION, doc, ops);
    });
  }
}
SFProjectMigration7.VERSION = 7;
class SFProjectMigration8 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a;
      const ops = [];
      const percentCompleted = (_a = doc.data.sync) === null || _a === void 0 ? void 0 : _a.percentCompleted;
      if (percentCompleted != null) {
        ops.push({ p: ['sync', 'percentCompleted'], od: percentCompleted });
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration8.VERSION, doc, ops);
      }
    });
  }
}
SFProjectMigration8.VERSION = 8;
/**
 * This migration removes the shareLevel property from the translateConfig and checkingConfig objects.
 * Project admins now select whether a share link can be used by only one person or by anyone at the time the
 * link is created (rather than configuring it on the project).
 */
class SFProjectMigration9 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b;
      const ops = [];
      const translateConfigShareLevel =
        (_a = doc.data.translateConfig) === null || _a === void 0 ? void 0 : _a.shareLevel;
      if (translateConfigShareLevel != null) {
        ops.push({ p: ['translateConfig', 'shareLevel'], od: translateConfigShareLevel });
      }
      const checkingConfigShareLevel =
        (_b = doc.data.checkingConfig) === null || _b === void 0 ? void 0 : _b.shareLevel;
      if (checkingConfigShareLevel != null) {
        ops.push({ p: ['checkingConfig', 'shareLevel'], od: checkingConfigShareLevel });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration9.VERSION, doc, ops);
    });
  }
}
SFProjectMigration9.VERSION = 9;
class SFProjectMigration10 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig != null) {
        ops.push({ p: ['translateConfig', 'preTranslate'], oi: false });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration10.VERSION, doc, ops);
    });
  }
}
SFProjectMigration10.VERSION = 10;
class SFProjectMigration11 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.biblicalTermsConfig == null) {
        ops.push({ p: ['biblicalTermsConfig'], oi: {} });
      }
      if (doc.data.biblicalTermsConfig == null || doc.data.biblicalTermsConfig.biblicalTermsEnabled === undefined) {
        ops.push({ p: ['biblicalTermsConfig', 'biblicalTermsEnabled'], oi: false });
      }
      if (doc.data.biblicalTermsConfig == null || doc.data.biblicalTermsConfig.hasRenderings === undefined) {
        ops.push({ p: ['biblicalTermsConfig', 'hasRenderings'], oi: false });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration11.VERSION, doc, ops);
    });
  }
}
SFProjectMigration11.VERSION = 11;
class SFProjectMigration12 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig == null) {
        ops.push({ p: ['translateConfig', 'draftConfig'], oi: {} });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration12.VERSION, doc, ops);
    });
  }
}
SFProjectMigration12.VERSION = 12;
class SFProjectMigration13 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig.lastSelectedBooks == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'lastSelectedBooks'], oi: [] });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration13.VERSION, doc, ops);
    });
  }
}
SFProjectMigration13.VERSION = 13;
class SFProjectMigration14 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'alternateTrainingSourceEnabled'], oi: false });
      }
      if (doc.data.translateConfig.draftConfig.lastSelectedTrainingBooks == null) {
        const lastSelectedBooks = doc.data.translateConfig.draftConfig.lastSelectedBooks;
        if (lastSelectedBooks != null) {
          ops.push({ p: ['translateConfig', 'draftConfig', 'lastSelectedBooks'], od: lastSelectedBooks });
          ops.push({ p: ['translateConfig', 'draftConfig', 'lastSelectedTrainingBooks'], oi: lastSelectedBooks });
        } else {
          ops.push({ p: ['translateConfig', 'draftConfig', 'lastSelectedTrainingBooks'], oi: [] });
        }
      }
      if (doc.data.translateConfig.draftConfig.lastSelectedTranslationBooks == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'lastSelectedTranslationBooks'], oi: [] });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration14.VERSION, doc, ops);
    });
  }
}
SFProjectMigration14.VERSION = 14;
class SFProjectMigration15 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b;
      const ops = [];
      for (
        let i = 0;
        i <
        ((_b = (_a = doc.data.noteTags) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0
          ? _b
          : 0);
        i++
      ) {
        const noteTag = doc.data.noteTags[i];
        if (!noteTag.creatorResolve) {
          ops.push({ p: ['noteTags', i, 'creatorResolve'], od: noteTag.creatorResolve });
          ops.push({ p: ['noteTags', i, 'creatorResolve'], oi: true });
        }
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration15.VERSION, doc, ops);
    });
  }
}
SFProjectMigration15.VERSION = 15;
class SFProjectMigration16 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig.sendAllSegments == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'sendAllSegments'], oi: false });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration16.VERSION, doc, ops);
    });
  }
}
SFProjectMigration16.VERSION = 16;
class SFProjectMigration17 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig.lastSelectedTrainingDataFiles == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'lastSelectedTrainingDataFiles'], oi: [] });
      }
      if (doc.data.translateConfig.draftConfig.additionalTrainingData == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'additionalTrainingData'], oi: false });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration17.VERSION, doc, ops);
    });
  }
}
SFProjectMigration17.VERSION = 17;
class SFProjectMigration18 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig.alternateSourceEnabled == null) {
        if (doc.data.translateConfig.draftConfig.alternateSource != null) {
          ops.push({ p: ['translateConfig', 'draftConfig', 'alternateSourceEnabled'], oi: true });
        } else {
          ops.push({ p: ['translateConfig', 'draftConfig', 'alternateSourceEnabled'], oi: false });
        }
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration18.VERSION, doc, ops);
    });
  }
}
SFProjectMigration18.VERSION = 18;
class SFProjectMigration19 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig.sendAllSegments != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'sendAllSegments'],
          od: doc.data.translateConfig.draftConfig.sendAllSegments
        });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration19.VERSION, doc, ops);
    });
  }
}
SFProjectMigration19.VERSION = 19;
class SFProjectMigration20 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig.additionalTrainingSourceEnabled == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'additionalTrainingSourceEnabled'], oi: false });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration20.VERSION, doc, ops);
    });
  }
}
SFProjectMigration20.VERSION = 20;
class SFProjectMigration21 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.rolePermissions == null) {
        ops.push({ p: ['rolePermissions'], oi: {} });
        // Migrate and remove checkingConfig.shareEnabled
        const permissions = [
          sf_project_rights_1.SF_PROJECT_RIGHTS.joinRight(
            sf_project_rights_1.SFProjectDomain.UserInvites,
            project_rights_1.Operation.Create
          )
        ];
        const checkingConfigShareEnabled = doc.data.checkingConfig.shareEnabled;
        if (checkingConfigShareEnabled === true) {
          ops.push({
            p: ['rolePermissions', sf_project_role_1.SFProjectRole.CommunityChecker],
            oi: permissions
          });
        }
        if (checkingConfigShareEnabled != null) {
          ops.push({ p: ['checkingConfig', 'shareEnabled'], od: checkingConfigShareEnabled });
        }
        // Migrate and remove translateConfig.shareEnabled
        const translateConfigShareEnabled = doc.data.translateConfig.shareEnabled;
        if (translateConfigShareEnabled === true) {
          ops.push({
            p: ['rolePermissions', sf_project_role_1.SFProjectRole.Commenter],
            oi: permissions
          });
          ops.push({
            p: ['rolePermissions', sf_project_role_1.SFProjectRole.Viewer],
            oi: permissions
          });
        }
        if (translateConfigShareEnabled != null) {
          ops.push({ p: ['translateConfig', 'shareEnabled'], od: translateConfigShareEnabled });
        }
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration21.VERSION, doc, ops);
    });
  }
}
SFProjectMigration21.VERSION = 21;
class SFProjectMigration22 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      if (doc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange == null) {
        const trainingRangeFromBooks = doc.data.translateConfig.draftConfig.lastSelectedTrainingBooks.map(b =>
          scripture_1.Canon.bookNumberToId(b)
        );
        if (trainingRangeFromBooks.length > 0) {
          ops.push({
            p: ['translateConfig', 'draftConfig', 'lastSelectedTrainingScriptureRange'],
            oi: trainingRangeFromBooks.join(';')
          });
        }
      }
      if (doc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange == null) {
        const translationRangeFromBooks = doc.data.translateConfig.draftConfig.lastSelectedTranslationBooks.map(b =>
          scripture_1.Canon.bookNumberToId(b)
        );
        if (translationRangeFromBooks.length > 0) {
          ops.push({
            p: ['translateConfig', 'draftConfig', 'lastSelectedTranslationScriptureRange'],
            oi: translationRangeFromBooks.join(';')
          });
        }
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration22.VERSION, doc, ops);
    });
  }
}
SFProjectMigration22.VERSION = 22;
class SFProjectMigration23 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a;
      const ops = [];
      if (
        ((_a = doc.data.translateConfig.draftConfig.usfmConfig) === null || _a === void 0
          ? void 0
          : _a.preserveParagraphMarkers) != null
      ) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'usfmConfig'],
          od: doc.data.translateConfig.draftConfig.usfmConfig
        });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration23.VERSION, doc, ops);
    });
  }
}
SFProjectMigration23.VERSION = 23;
class SFProjectMigration24 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b;
      const ops = [];
      if (
        ((_b = (_a = doc.data.translateConfig) === null || _a === void 0 ? void 0 : _a.draftConfig) === null ||
        _b === void 0
          ? void 0
          : _b.additionalTrainingData) != null
      ) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'additionalTrainingData'],
          od: doc.data.translateConfig.draftConfig.additionalTrainingData
        });
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration24.VERSION, doc, ops);
      }
    });
  }
}
SFProjectMigration24.VERSION = 24;
class SFProjectMigration25 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b, _c, _d;
      const ops = [];
      if (doc.data.lynxConfig == null) {
        ops.push({ p: ['lynxConfig'], oi: {} });
      }
      if (((_a = doc.data.lynxConfig) === null || _a === void 0 ? void 0 : _a.autoCorrectionsEnabled) == null) {
        ops.push({ p: ['lynxConfig', 'autoCorrectionsEnabled'], oi: false });
      }
      if (((_b = doc.data.lynxConfig) === null || _b === void 0 ? void 0 : _b.assessmentsEnabled) == null) {
        ops.push({ p: ['lynxConfig', 'assessmentsEnabled'], oi: false });
      }
      if (((_c = doc.data.lynxConfig) === null || _c === void 0 ? void 0 : _c.punctuationCheckerEnabled) == null) {
        ops.push({ p: ['lynxConfig', 'punctuationCheckerEnabled'], oi: false });
      }
      if (((_d = doc.data.lynxConfig) === null || _d === void 0 ? void 0 : _d.allowedCharacterCheckerEnabled) == null) {
        ops.push({ p: ['lynxConfig', 'allowedCharacterCheckerEnabled'], oi: false });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration25.VERSION, doc, ops);
    });
  }
}
SFProjectMigration25.VERSION = 25;
class SFProjectMigration26 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
      const ops = [];
      // Remove the lastSelectedTrainingBooks
      if (doc.data.translateConfig.draftConfig.lastSelectedTrainingBooks != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'lastSelectedTrainingBooks'],
          od: doc.data.translateConfig.draftConfig.lastSelectedTrainingBooks
        });
      }
      // Remove the lastSelectedTranslationBooks
      if (doc.data.translateConfig.draftConfig.lastSelectedTranslationBooks != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'lastSelectedTranslationBooks'],
          od: doc.data.translateConfig.draftConfig.lastSelectedTranslationBooks
        });
      }
      // Migrate the lastSelectedTrainingScriptureRange
      if (
        ((_b = (_a = doc.data.translateConfig) === null || _a === void 0 ? void 0 : _a.draftConfig) === null ||
        _b === void 0
          ? void 0
          : _b.lastSelectedTrainingScriptureRange) != null
      ) {
        const scriptureRange = doc.data.translateConfig.draftConfig.lastSelectedTrainingScriptureRange;
        if (
          ((_d = (_c = doc.data.translateConfig) === null || _c === void 0 ? void 0 : _c.draftConfig) === null ||
          _d === void 0
            ? void 0
            : _d.lastSelectedTrainingScriptureRanges) == null ||
          ((_f = (_e = doc.data.translateConfig) === null || _e === void 0 ? void 0 : _e.draftConfig) === null ||
          _f === void 0
            ? void 0
            : _f.lastSelectedTrainingScriptureRanges.length) == 0
        ) {
          const projectId =
            doc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled &&
            ((_g = doc.data.translateConfig.draftConfig.alternateTrainingSource) === null || _g === void 0
              ? void 0
              : _g.projectRef) != null
              ? doc.data.translateConfig.draftConfig.alternateTrainingSource.projectRef
              : (_h = doc.data.translateConfig.source) === null || _h === void 0
                ? void 0
                : _h.projectRef;
          ops.push({
            p: ['translateConfig', 'draftConfig', 'lastSelectedTrainingScriptureRanges'],
            oi: [{ projectId, scriptureRange }]
          });
        }
        ops.push({
          p: ['translateConfig', 'draftConfig', 'lastSelectedTrainingScriptureRange'],
          od: scriptureRange
        });
      }
      // Migrate the lastSelectedTranslationScriptureRange
      if (
        ((_k = (_j = doc.data.translateConfig) === null || _j === void 0 ? void 0 : _j.draftConfig) === null ||
        _k === void 0
          ? void 0
          : _k.lastSelectedTranslationScriptureRange) != null
      ) {
        const scriptureRange = doc.data.translateConfig.draftConfig.lastSelectedTranslationScriptureRange;
        if (
          ((_m = (_l = doc.data.translateConfig) === null || _l === void 0 ? void 0 : _l.draftConfig) === null ||
          _m === void 0
            ? void 0
            : _m.lastSelectedTranslationScriptureRanges) == null ||
          ((_p = (_o = doc.data.translateConfig) === null || _o === void 0 ? void 0 : _o.draftConfig) === null ||
          _p === void 0
            ? void 0
            : _p.lastSelectedTranslationScriptureRanges.length) == 0
        ) {
          const projectId =
            doc.data.translateConfig.draftConfig.alternateSourceEnabled &&
            ((_q = doc.data.translateConfig.draftConfig.alternateSource) === null || _q === void 0
              ? void 0
              : _q.projectRef) != null
              ? doc.data.translateConfig.draftConfig.alternateSource.projectRef
              : (_r = doc.data.translateConfig.source) === null || _r === void 0
                ? void 0
                : _r.projectRef;
          ops.push({
            p: ['translateConfig', 'draftConfig', 'lastSelectedTranslationScriptureRanges'],
            oi: [{ projectId, scriptureRange }]
          });
        }
        ops.push({
          p: ['translateConfig', 'draftConfig', 'lastSelectedTranslationScriptureRange'],
          od: scriptureRange
        });
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration26.VERSION, doc, ops);
      }
    });
  }
}
SFProjectMigration26.VERSION = 26;
class SFProjectMigration27 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      const ops = [];
      const draftingSources = [];
      const trainingSources = [];
      // Migrate the old values to the new structure
      if (doc.data.translateConfig.preTranslate === true) {
        const translateConfig = doc.data.translateConfig;
        const draftConfig = translateConfig.draftConfig;
        if (draftConfig.alternateTrainingSourceEnabled && draftConfig.alternateTrainingSource != null) {
          trainingSources.push(draftConfig.alternateTrainingSource);
        } else if (translateConfig.source != null) {
          trainingSources.push(translateConfig.source);
        }
        if (draftConfig.additionalTrainingSourceEnabled && draftConfig.additionalTrainingSource != null) {
          trainingSources.push(draftConfig.additionalTrainingSource);
        }
        if (draftConfig.alternateSourceEnabled && draftConfig.alternateSource != null) {
          draftingSources.push(draftConfig.alternateSource);
        } else if (translateConfig.source != null) {
          draftingSources.push(translateConfig.source);
        }
      }
      // Create the new structure
      if (doc.data.translateConfig.draftConfig.draftingSources == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'draftingSources'], oi: draftingSources });
      }
      if (doc.data.translateConfig.draftConfig.trainingSources == null) {
        ops.push({ p: ['translateConfig', 'draftConfig', 'trainingSources'], oi: trainingSources });
      }
      // Remove the old values
      if (doc.data.translateConfig.draftConfig.alternateSourceEnabled != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'alternateSourceEnabled'],
          od: doc.data.translateConfig.draftConfig.alternateSourceEnabled
        });
      }
      if (doc.data.translateConfig.draftConfig.alternateSource != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'alternateSource'],
          od: doc.data.translateConfig.draftConfig.alternateSource
        });
      }
      if (doc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'alternateTrainingSourceEnabled'],
          od: doc.data.translateConfig.draftConfig.alternateTrainingSourceEnabled
        });
      }
      if (doc.data.translateConfig.draftConfig.alternateTrainingSource != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'alternateTrainingSource'],
          od: doc.data.translateConfig.draftConfig.alternateTrainingSource
        });
      }
      if (doc.data.translateConfig.draftConfig.additionalTrainingSourceEnabled != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'additionalTrainingSourceEnabled'],
          od: doc.data.translateConfig.draftConfig.additionalTrainingSourceEnabled
        });
      }
      if (doc.data.translateConfig.draftConfig.additionalTrainingSource != null) {
        ops.push({
          p: ['translateConfig', 'draftConfig', 'additionalTrainingSource'],
          od: doc.data.translateConfig.draftConfig.additionalTrainingSource
        });
      }
      yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration27.VERSION, doc, ops);
    });
  }
}
SFProjectMigration27.VERSION = 27;
class SFProjectMigration28 extends migration_1.DocMigration {
  migrateDoc(doc) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f;
      const ops = [];
      if (
        ((_a = doc.data) === null || _a === void 0 ? void 0 : _a.texts) != null &&
        ((_d =
          (_c = (_b = doc.data) === null || _b === void 0 ? void 0 : _b.translateConfig) === null || _c === void 0
            ? void 0
            : _c.draftConfig) === null || _d === void 0
          ? void 0
          : _d.currentScriptureRange) == null
      ) {
        const currentScriptureRange = doc.data.texts
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          .filter(t => t.chapters.some(c => c.hasDraft))
          .map(t => scripture_1.Canon.bookNumberToId(t.bookNum, ''))
          .filter(id => id !== '')
          .join(';');
        if (currentScriptureRange !== '' && currentScriptureRange != null) {
          ops.push({
            p: ['translateConfig', 'draftConfig', 'currentScriptureRange'],
            oi: currentScriptureRange
          });
          if (
            ((_f = (_e = doc.data.translateConfig) === null || _e === void 0 ? void 0 : _e.draftConfig) === null ||
            _f === void 0
              ? void 0
              : _f.draftedScriptureRange) == null
          ) {
            ops.push({
              p: ['translateConfig', 'draftConfig', 'draftedScriptureRange'],
              oi: currentScriptureRange
            });
          }
        }
      }
      if (ops.length > 0) {
        yield (0, realtime_server_1.submitMigrationOp)(SFProjectMigration28.VERSION, doc, ops);
      }
    });
  }
}
SFProjectMigration28.VERSION = 28;
exports.SF_PROJECT_MIGRATIONS = (0, migration_1.monotonicallyIncreasingMigrationList)([
  SFProjectMigration1,
  SFProjectMigration2,
  SFProjectMigration3,
  SFProjectMigration4,
  SFProjectMigration5,
  SFProjectMigration6,
  SFProjectMigration7,
  SFProjectMigration8,
  SFProjectMigration9,
  SFProjectMigration10,
  SFProjectMigration11,
  SFProjectMigration12,
  SFProjectMigration13,
  SFProjectMigration14,
  SFProjectMigration15,
  SFProjectMigration16,
  SFProjectMigration17,
  SFProjectMigration18,
  SFProjectMigration19,
  SFProjectMigration20,
  SFProjectMigration21,
  SFProjectMigration22,
  SFProjectMigration23,
  SFProjectMigration24,
  SFProjectMigration25,
  SFProjectMigration26,
  SFProjectMigration27,
  SFProjectMigration28
]);
//# sourceMappingURL=sf-project-migrations.js.map
