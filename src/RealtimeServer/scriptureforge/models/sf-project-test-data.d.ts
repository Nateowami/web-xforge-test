import { RecursivePartial } from '../../common/utils/type-utils';
import { SFProject, SFProjectProfile } from './sf-project';
export declare function createTestProjectProfile(
  overrides?: RecursivePartial<SFProjectProfile>,
  ordinal?: number
): SFProjectProfile;
export declare function createTestProject(overrides?: RecursivePartial<SFProject>, ordinal?: number): SFProject;
