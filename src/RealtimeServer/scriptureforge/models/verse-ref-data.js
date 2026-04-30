'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.toVerseRef = toVerseRef;
exports.fromVerseRef = fromVerseRef;
exports.toStartAndEndVerseRefs = toStartAndEndVerseRefs;
const scripture_1 = require('@sillsdev/scripture');
function toVerseRef(verseRefData) {
  return new scripture_1.VerseRef(
    scripture_1.Canon.bookNumberToId(verseRefData.bookNum),
    verseRefData.chapterNum.toString(),
    verseRefData.verse != null ? verseRefData.verse : verseRefData.verseNum.toString()
  );
}
function fromVerseRef(input) {
  return {
    bookNum: input.bookNum,
    chapterNum: input.chapterNum,
    verseNum: input.verseNum,
    verse: input.verse === input.verseNum.toString() ? undefined : input.verse
  };
}
function toStartAndEndVerseRefs(verseRefOrVerseRefData) {
  const verseRef =
    verseRefOrVerseRefData instanceof scripture_1.VerseRef
      ? verseRefOrVerseRefData
      : toVerseRef(verseRefOrVerseRefData);
  let startVerseRef = verseRef;
  let endVerseRef;
  if (verseRef.hasMultiple) {
    const allVerses = verseRef.allVerses(true);
    startVerseRef = allVerses[0];
    endVerseRef = allVerses[allVerses.length - 1];
  }
  return { startVerseRef, endVerseRef };
}
//# sourceMappingURL=verse-ref-data.js.map
