import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import { SF_PROJECT_RIGHTS } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { isTranslateRole, SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { ProjectRoleInfo } from 'xforge-common/models/project-role-info';

export const SF_PROJECT_ROLES: ProjectRoleInfo[] = [
  { role: SFProjectRole.ParatextAdministrator, canBeShared: false },
  { role: SFProjectRole.ParatextTranslator, canBeShared: false },
  { role: SFProjectRole.ParatextConsultant, canBeShared: false },
  { role: SFProjectRole.ParatextObserver, canBeShared: false },
  { role: SFProjectRole.Reviewer, canBeShared: true },
  { role: SFProjectRole.CommunityChecker, canBeShared: true },
  { role: SFProjectRole.Observer, canBeShared: true }
];

export function canAccessTranslateApp(role?: SFProjectRole): boolean {
  return isTranslateRole(role);
}

export function canAccessCommunityCheckingApp(role: SFProjectRole): boolean {
  return SF_PROJECT_RIGHTS.roleHasRight(role, 'questions', Operation.View);
}

export const SF_DEFAULT_SHARE_ROLE: SFProjectRole = SFProjectRole.CommunityChecker;
export const SF_DEFAULT_TRANSLATE_SHARE_ROLE: SFProjectRole = SFProjectRole.Observer;
