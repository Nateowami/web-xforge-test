export declare function isParatextRole(role: string | undefined): boolean;
export declare function isTranslateRole(role: string | undefined): boolean;
export declare enum SFProjectRole {
  ParatextAdministrator = 'pt_administrator',
  ParatextTranslator = 'pt_translator',
  ParatextConsultant = 'pt_consultant',
  ParatextObserver = 'pt_observer',
  CommunityChecker = 'sf_community_checker',
  Commenter = 'sf_commenter',
  Viewer = 'sf_observer',
  None = 'none'
}
