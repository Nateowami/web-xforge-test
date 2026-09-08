import { Canon, VerseRef } from '@sillsdev/scripture';
import { attributeFromMouseEvent } from './utils';

// Regular expression for getting the verse from a segment ref
// Some projects will have the right to left marker in the segment attribute which we need to account for
const VERSE_FROM_SEGMENT_REF_REGEX = /verse_\d+_(\d+[\u200f]?[a-z]?[,-]?\d*[a-z]?[^\/]?)/;
// Regular expression for the verse segment ref of scripture content
export const VERSE_REGEX = /verse_[0-9]+_[0-9]+/;
// Regular expression for a verse string that identifies a part of a verse, e.g. 6a
const VERSE_LETTER_REGEX = /[a-z]/i;
export const RIGHT_TO_LEFT_MARK = '\u200f';
export const LEFT_TO_RIGHT_EMBEDDING = '\u202A';
export const POP_DIRECTIONAL_FORMATTING = '\u202C';

/**
 * Returns the base verse of the segment ref. e.g. 'verse_1_5'
 * @return The segment ref of the first segment in the verse, or undefined if the segment does not belong to a verse.
 */
export function getBaseVerse(segmentRef: string): string | undefined {
  const matchArray: RegExpExecArray | null = VERSE_FROM_SEGMENT_REF_REGEX.exec(segmentRef);
  return matchArray == null ? undefined : matchArray[0];
}

export function getVerseRefFromSegmentRef(bookNum: number, segmentRef: string): VerseRef | undefined {
  const baseRef: string | undefined = getBaseVerse(segmentRef);
  if (baseRef == null) {
    return undefined;
  }
  const parts = baseRef.split('_');
  return new VerseRef(Canon.bookNumberToId(bookNum), parts[1], parts[2]);
}

/** Returns the verse string from a segment ref. e.g. 6, 6a, 6-7, 6,8 */
export function getVerseStrFromSegmentRef(segmentRef: string): string | undefined {
  const match: RegExpExecArray | null = VERSE_FROM_SEGMENT_REF_REGEX.exec(segmentRef);
  if (match != null) {
    return match[1].replace(RIGHT_TO_LEFT_MARK, '');
  }
  return undefined;
}

export function verseSlug(verse: VerseRef): string {
  return 'verse_' + verse.chapterNum + '_' + (verse.verse == null ? verse.verseNum : verse.verse);
}

/**
 * Determines whether two verse strings (e.g. 6, 6a, 6-7, 6,8) refer to any of the same verses. This is not
 * simply string equality, as Paratext can combine or separate verses at any time, which leaves features
 * anchored to a verse that the text now covers with a different verse string. e.g. a note on verse 6 still
 * belongs to the verse when Paratext combines verses 6 and 7 into 6-7. Verse strings that identify a part of
 * a verse with a letter only refer to the same verses when they are identical, as the parts of a verse cannot
 * be distinguished by verse number.
 */
export function verseStrsRefSameVerses(verseStr: string, otherVerseStr: string): boolean {
  if (verseStr === otherVerseStr) {
    return true;
  }
  if (VERSE_LETTER_REGEX.test(verseStr) || VERSE_LETTER_REGEX.test(otherVerseStr)) {
    return false;
  }
  const otherVerseNums: Set<number> = new Set<number>(getVerseNumsFromVerseStr(otherVerseStr));
  return getVerseNumsFromVerseStr(verseStr).some(verseNum => otherVerseNums.has(verseNum));
}

/** Returns every verse number a verse string covers, expanding ranges. e.g. 6-8 returns [6, 7, 8] */
function getVerseNumsFromVerseStr(verseStr: string): number[] {
  const verseNums: number[] = [];
  for (const versePart of verseStr.split(',')) {
    const bounds: number[] = versePart.split('-').map(bound => Number.parseInt(bound));
    const start: number = bounds[0];
    const end: number = bounds[bounds.length - 1];
    if (Number.isNaN(start)) {
      continue;
    }
    for (let verseNum = start; verseNum <= (Number.isNaN(end) ? start : end); verseNum++) {
      verseNums.push(verseNum);
    }
  }
  return verseNums;
}

/**
 * Combines start and end verse reference strings into a single VerseRef.
 * @param startStr The starting verse reference string.
 * @param endStr The optional ending verse reference string.
 * @returns A VerseRef representing the range, single verse, or undefined if invalid.
 */
export function combineVerseRefStrs(startStr: string, endStr?: string): VerseRef | undefined {
  if (startStr === '') {
    // no start ref
    return undefined;
  }

  const start = VerseRef.tryParse(startStr);
  if (!start.success) {
    // invalid start ref
    return undefined;
  }

  if (endStr == null || endStr === '') {
    // no end ref
    return start.verseRef;
  }

  const end = VerseRef.tryParse(endStr);
  if (!end.success || start.verseRef.BBBCCC !== end.verseRef.BBBCCC) {
    // invalid end ref
    return undefined;
  }

  if (start.verseRef.equals(end.verseRef)) {
    // start and end refs are the same
    return start.verseRef;
  }

  // range
  const rangeStr = `${startStr}-${end.verseRef.verse}`;
  const range = VerseRef.tryParse(rangeStr);
  if (!range.success) {
    return undefined;
  }
  return range.verseRef;
}

/**
 * Get the verses numbers from a verse reference.
 * @returns The verse numbers in the VerseRef as integers.
 * */
export function getVerseNumbers(verseRef: VerseRef): number[] {
  const verseList: number[] = [];
  if (verseRef.verse == null) {
    verseList.push(verseRef.verseNum); // no bridge or segment info included in verse
    return verseList;
  }

  let verseStr = '';
  for (let i = 0; i < verseRef.verse.length; i++) {
    if (verseRef.verse[i].match(/[0-9]/i)) {
      verseStr += verseRef.verse[i];
    } else if (verseStr.length > 0) {
      verseList.push(parseInt(verseStr));
      verseStr = '';
    }
  }

  if (verseStr.length > 0) {
    verseList.push(parseInt(verseStr)); // add any accumulated digits
  }

  return verseList;
}

export function verseRefFromMouseEvent(event: MouseEvent, bookNum: number): VerseRef | undefined {
  const clickSegment = attributeFromMouseEvent(event, 'USX-SEGMENT', 'data-segment');
  if (clickSegment == null) {
    return undefined;
  }
  const segmentParts = clickSegment.split('_', 3);
  const versePart = segmentParts[2].split('/')[0];
  return new VerseRef(Canon.bookNumberToId(bookNum), segmentParts[1], versePart);
}
