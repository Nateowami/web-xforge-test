'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TEXT_INDEX_PATHS = exports.TEXTS_COLLECTION = void 0;
exports.getTextDocId = getTextDocId;
const scripture_1 = require('@sillsdev/scripture');
exports.TEXTS_COLLECTION = 'texts';
exports.TEXT_INDEX_PATHS = [];
function getTextDocId(projectId, book, chapter, textType = 'target') {
  return `${projectId}:${scripture_1.Canon.bookNumberToId(book)}:${chapter}:${textType}`;
}
//# sourceMappingURL=text-data.js.map
