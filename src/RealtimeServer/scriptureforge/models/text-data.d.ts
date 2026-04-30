import { DeltaOperation } from 'rich-text';
export declare const TEXTS_COLLECTION = 'texts';
export declare const TEXT_INDEX_PATHS: string[];
export type TextType = 'source' | 'target';
export declare function getTextDocId(projectId: string, book: number, chapter: number, textType?: TextType): string;
export interface TextData {
  ops?: DeltaOperation[];
}
