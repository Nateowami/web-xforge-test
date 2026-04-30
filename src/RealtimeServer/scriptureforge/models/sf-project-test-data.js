'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTestProjectProfile = createTestProjectProfile;
exports.createTestProject = createTestProject;
const merge_1 = __importDefault(require('lodash/merge'));
const checking_config_1 = require('./checking-config');
function testProjectProfile(ordinal) {
  return {
    name: `Test project ${ordinal}`,
    rolePermissions: {},
    userRoles: {},
    userPermissions: {},
    syncDisabled: false,
    paratextId: `paratextId${ordinal}`,
    shortName: `P${ordinal}`,
    writingSystem: { tag: 'en' },
    isRightToLeft: false,
    translateConfig: {
      translationSuggestionsEnabled: false,
      preTranslate: false,
      defaultNoteTagId: 1,
      draftConfig: {
        draftingSources: [],
        trainingSources: [],
        lastSelectedTrainingDataFiles: []
      }
    },
    checkingConfig: {
      checkingEnabled: true,
      usersSeeEachOthersResponses: true,
      answerExportMethod: checking_config_1.CheckingAnswerExport.MarkedForExport,
      hideCommunityCheckingText: false
    },
    texts: [],
    sync: {
      queuedCount: 0,
      lastSyncSuccessful: true,
      dateLastSuccessfulSync: new Date('2020-01-01').toISOString(),
      dataInSync: true
    },
    biblicalTermsConfig: {
      biblicalTermsEnabled: false,
      hasRenderings: false
    },
    lynxConfig: {
      autoCorrectionsEnabled: false,
      assessmentsEnabled: false,
      punctuationCheckerEnabled: false,
      allowedCharacterCheckerEnabled: false
    },
    editable: true,
    defaultFontSize: 12,
    defaultFont: 'Charis SIL',
    maxGeneratedUsersPerShareKey: 250
  };
}
function testProject(ordinal) {
  return Object.assign(Object.assign({}, testProjectProfile(ordinal)), { paratextUsers: [] });
}
function createTestProjectProfile(overrides, ordinal = 1) {
  return (0, merge_1.default)(testProjectProfile(ordinal), overrides);
}
function createTestProject(overrides, ordinal = 1) {
  return (0, merge_1.default)(testProject(ordinal), overrides);
}
//# sourceMappingURL=sf-project-test-data.js.map
