import { ProjectData } from '../../common/models/project-data';
import { BiblicalTermDefinition } from './biblical-term-definition';
export declare const BIBLICAL_TERM_COLLECTION = 'biblical_terms';
export declare const BIBLICAL_TERM_INDEX_PATHS: (
  | string
  | {
      [x: string]: number;
    }
)[];
export declare function getBiblicalTermDocId(projectId: string, dataId: string): string;
export interface BiblicalTerm extends ProjectData {
  dataId: string;
  termId: string;
  transliteration: string;
  renderings: string[];
  description: string;
  language: string;
  links: string[];
  references: number[];
  definitions: {
    [language: string]: BiblicalTermDefinition;
  };
}
