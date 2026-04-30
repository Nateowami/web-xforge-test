import { RecursivePartial } from '../utils/type-utils';
import { User, UserProfile } from './user';
export declare function createTestUserProfile(overrides?: RecursivePartial<UserProfile>, ordinal?: number): UserProfile;
export declare function createTestUser(overrides?: RecursivePartial<User>, ordinal?: number): User;
