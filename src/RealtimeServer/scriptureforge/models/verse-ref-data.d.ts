import { VerseRef } from '@sillsdev/scripture';
export declare function toVerseRef(verseRefData: VerseRefData): VerseRef;
export declare function fromVerseRef(input: VerseRef): VerseRefData;
export declare function toStartAndEndVerseRefs(verseRefOrVerseRefData: VerseRefData | VerseRef): {
  startVerseRef: VerseRef;
  endVerseRef?: VerseRef;
};
export interface VerseRefData {
  bookNum: number;
  chapterNum: number;
  verseNum: number;
  verse?: string;
}
