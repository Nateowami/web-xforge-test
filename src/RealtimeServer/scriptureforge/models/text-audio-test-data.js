'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTestTextAudio = createTestTextAudio;
const merge_1 = __importDefault(require('lodash/merge'));
function testTextAudio(ordinal) {
  return {
    ownerRef: '',
    projectRef: '',
    dataId: '',
    timings: [],
    mimeType: 'audio/opus',
    audioUrl: `https://example.com/file${ordinal}.opus`
  };
}
function createTestTextAudio(overrides, ordinal = 1) {
  return (0, merge_1.default)(testTextAudio(ordinal), overrides);
}
//# sourceMappingURL=text-audio-test-data.js.map
