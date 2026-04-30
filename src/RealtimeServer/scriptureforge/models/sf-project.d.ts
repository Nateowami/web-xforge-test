import { CreateIndexesOptions } from 'mongodb';
import { Project } from '../../common/models/project';
import { WritingSystem } from '../../common/models/writing-system';
import { BiblicalTermsConfig } from './biblical-terms-config';
import { CheckingConfig } from './checking-config';
import { LynxConfig } from './lynx-config';
import { NoteTag } from './note-tag';
import { ParatextUserProfile } from './paratext-user-profile';
import { Sync } from './sync';
import { TextInfo } from './text-info';
import { TranslateConfig } from './translate-config';
export declare const SF_PROJECT_PROFILES_COLLECTION = 'sf_projects_profile';
export declare const SF_PROJECT_PROFILES_INDEX_PATHS: string[];
export declare const SF_PROJECTS_COLLECTION = 'sf_projects';
export declare const SF_PROJECT_INDEX_PATHS: (string | [string, CreateIndexesOptions])[];
/** Length of id for a DBL resource. */
export declare const DBL_RESOURCE_ID_LENGTH: number;
/** See documentation in SFProject.cs. */
export interface SFProjectProfile extends Project {
  paratextId: string;
  shortName: string;
  writingSystem: WritingSystem;
  isRightToLeft?: boolean;
  translateConfig: TranslateConfig;
  checkingConfig: CheckingConfig;
  resourceConfig?: ResourceConfig;
  lynxConfig: LynxConfig;
  texts: TextInfo[];
  noteTags?: NoteTag[];
  sync: Sync;
  editable: boolean;
  defaultFontSize?: number;
  defaultFont?: string;
  maxGeneratedUsersPerShareKey?: number;
  biblicalTermsConfig: BiblicalTermsConfig;
  copyrightBanner?: string;
  copyrightNotice?: string;
  visibility?: string;
}
export interface SFProject extends SFProjectProfile {
  paratextUsers: ParatextUserProfile[];
}
export interface ResourceConfig {
  createdTimestamp: Date;
  manifestChecksum: string;
  permissionsChecksum: string;
  revision: number;
}
/** Is the SF project that of a DBL resource, rather than a typical PT project? */
export declare function isResource(project: SFProjectProfile): boolean;
