import { ProjectData } from '../../common/models/project-data';
import { Answer } from './answer';
import { VerseRefData } from './verse-ref-data';
export declare const QUESTIONS_COLLECTION = 'questions';
export declare const QUESTION_INDEX_PATHS: (
  | string
  | {
      [x: string]: number;
    }
)[];
export declare function getQuestionDocId(projectId: string, questionId: string): string;
export interface Question extends ProjectData {
  dataId: string;
  verseRef: VerseRefData;
  text?: string;
  audioUrl?: string;
  answers: Answer[];
  isArchived: boolean;
  dateArchived?: string;
  dateModified: string;
  dateCreated: string;
  transceleratorQuestionId?: string;
  paratextNoteId?: string;
}
