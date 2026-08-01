import { TextInfo } from 'realtime-server/lib/esm/scriptureforge/models/text-info';

export interface TextsByBookId {
  [bookId: string]: TextInfo;
}

/**
 * Whether a book exists in the project but has no verses, i.e. Paratext has the book file but
 * nothing has been written in it yet.
 */
export function isEmptyBook(text: TextInfo): boolean {
  return text.chapters.length === 1 && text.chapters[0].lastVerse === 0;
}
