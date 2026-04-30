import { ProjectData } from '../../common/models/project-data';
import { EditorTabPersistData } from './editor-tab-persist-data';
import { LynxInsightUserData } from './lynx-insight-user-data';
export declare const SF_PROJECT_USER_CONFIGS_COLLECTION = 'sf_project_user_configs';
export declare const SF_PROJECT_USER_CONFIG_INDEX_PATHS: string[];
export declare function getSFProjectUserConfigDocId(projectId: string, userId: string): string;
export interface SFProjectUserConfig extends ProjectData {
  selectedTask?: string;
  selectedQuestionRef?: string;
  selectedBookNum?: number;
  selectedChapterNum?: number;
  selectedBiblicalTermsCategory?: string;
  selectedBiblicalTermsFilter?: string;
  isTargetTextRight: boolean;
  confidenceThreshold: number;
  biblicalTermsEnabled?: boolean;
  transliterateBiblicalTerms: boolean;
  translationSuggestionsEnabled: boolean;
  numSuggestions: number;
  selectedSegment: string;
  selectedSegmentChecksum?: number;
  noteRefsRead: string[];
  questionRefsRead: string[];
  answerRefsRead: string[];
  commentRefsRead: string[];
  editorTabsOpen: EditorTabPersistData[];
  lynxInsightState: LynxInsightUserData;
  selectedDraftTargetParatextId?: string;
}
