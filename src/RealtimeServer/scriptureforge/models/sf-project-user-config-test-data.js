'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTestProjectUserConfig = createTestProjectUserConfig;
const merge_1 = __importDefault(require('lodash/merge'));
function createTestProjectUserConfig(overrides) {
  // Create new object for each test
  const defaultSFProjectUserConfig = {
    projectRef: 'project01',
    ownerRef: '',
    isTargetTextRight: false,
    confidenceThreshold: 0.2,
    transliterateBiblicalTerms: false,
    translationSuggestionsEnabled: true,
    numSuggestions: 1,
    selectedSegment: '',
    questionRefsRead: [],
    answerRefsRead: [],
    commentRefsRead: [],
    noteRefsRead: [],
    editorTabsOpen: [],
    lynxInsightState: {}
  };
  return (0, merge_1.default)(defaultSFProjectUserConfig, overrides);
}
//# sourceMappingURL=sf-project-user-config-test-data.js.map
