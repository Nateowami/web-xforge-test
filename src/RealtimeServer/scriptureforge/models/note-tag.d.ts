export declare const BIBLICAL_TERM_TAG_ICON = 'biblicalterm1';
export declare const DEFAULT_TAG_ICON = '01flag1';
export declare const SF_TAG_ICON = '06star2';
export declare const SF_TAG_NAME = 'Scripture Forge Note';
export declare const TO_DO_TAG_ID = 1;
export declare const BIBLICAL_TERM_TAG_ID = -3;
export interface NoteTag {
  tagId: number;
  name: string;
  icon: string;
  creatorResolve: boolean;
}
