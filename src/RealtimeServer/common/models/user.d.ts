import { Site } from './site';
export declare const USER_PROFILES_COLLECTION = 'user_profiles';
export declare const USER_PROFILE_INDEX_PATHS: string[];
export declare const USERS_COLLECTION = 'users';
export declare const USER_INDEX_PATHS: string[];
export declare enum AuthType {
  Unknown = 0,
  Paratext = 1,
  Google = 2,
  Facebook = 3,
  Account = 4
}
export declare function getAuthType(authId: string): AuthType;
export interface UserProfile {
  displayName: string;
  avatarUrl: string;
}
export interface User extends UserProfile {
  name: string;
  email: string;
  paratextId?: string;
  roles: string[];
  isDisplayNameConfirmed: boolean;
  interfaceLanguage?: string;
  authId: string;
  sites: {
    [key: string]: Site;
  };
}
/** Do we understand the SF user to also be a PT user? */
export declare function isPTUser(user: User): boolean;
