'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TEXT_AUDIO_INDEX_PATHS = exports.TEXT_AUDIO_COLLECTION = void 0;
exports.getTextAudioId = getTextAudioId;
const scripture_1 = require('@sillsdev/scripture');
const project_data_1 = require('../../common/models/project-data');
exports.TEXT_AUDIO_COLLECTION = 'text_audio';
exports.TEXT_AUDIO_INDEX_PATHS = project_data_1.PROJECT_DATA_INDEX_PATHS;
function getTextAudioId(projectId, bookNum, chapterNum) {
  return `${projectId}:${scripture_1.Canon.bookNumberToId(bookNum)}:${chapterNum}:target`;
}
//# sourceMappingURL=text-audio.js.map
