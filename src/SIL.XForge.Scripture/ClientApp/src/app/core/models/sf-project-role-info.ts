import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import { SFProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { SF_PROJECT_RIGHTS, SFProjectDomain } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { isTranslateRole, SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { ProjectRoleInfo } from 'xforge-common/models/project-role-info';

export const SF_PROJECT_ROLES: ProjectRoleInfo[] = [
  { role: SFProjectRole.ParatextAdministrator, canBeShared: false },
  { role: SFProjectRole.ParatextTranslator, canBeShared: false },
  { role: SFProjectRole.ParatextConsultant, canBeShared: false },
  { role: SFProjectRole.ParatextObserver, canBeShared: false },
  { role: SFProjectRole.Commenter, canBeShared: true },
  { role: SFProjectRole.CommunityChecker, canBeShared: true },
  { role: SFProjectRole.Viewer, canBeShared: true }
];

export function roleCanAccessTranslate(role?: SFProjectRole): boolean {
  return isTranslateRole(role);
}

export function roleCanAccessCommunityChecking(role: SFProjectRole): boolean {
  return SF_PROJECT_RIGHTS.roleHasRight(role, SFProjectDomain.Questions, Operation.View);
}

export function roleCanAccessDrafts(role: SFProjectRole): boolean {
  return SF_PROJECT_RIGHTS.roleHasRight(role, SFProjectDomain.Drafts, Operation.View);
}

export function roleCanEditTexts(role: SFProjectRole): boolean {
  return SF_PROJECT_RIGHTS.roleHasRight(role, SFProjectDomain.Texts, Operation.Edit);
}

/**
 * Gets the roles that the specified user is allowed to invite others to join the project as. An empty array means the
 * user cannot share the project at all.
 *
 * If you update this function, you will need to update SFProjectService.GetAvailableRoles in C#.
 */
export function getUserShareableRoles(project: SFProjectProfile, userId: string): SFProjectRole[] {
  if (!SF_PROJECT_RIGHTS.hasRight(project, userId, SFProjectDomain.UserInvites, Operation.Create)) {
    return [];
  }

  const userRole = project.userRoles[userId];
  return [
    {
      role: SFProjectRole.CommunityChecker,
      permission:
        project.checkingConfig.checkingEnabled &&
        SF_PROJECT_RIGHTS.hasRight(project, userId, SFProjectDomain.Questions, Operation.View) &&
        userRole !== SFProjectRole.Commenter &&
        userRole !== SFProjectRole.Viewer
    },
    {
      role: SFProjectRole.Viewer,
      permission:
        SF_PROJECT_RIGHTS.hasRight(project, userId, SFProjectDomain.Texts, Operation.View) &&
        userRole !== SFProjectRole.CommunityChecker &&
        userRole !== SFProjectRole.Commenter
    },
    {
      role: SFProjectRole.Commenter,
      permission:
        SF_PROJECT_RIGHTS.hasRight(project, userId, SFProjectDomain.Notes, Operation.Create) &&
        userRole !== SFProjectRole.CommunityChecker &&
        userRole !== SFProjectRole.Viewer
    }
  ]
    .filter(info => info.permission)
    .map(info => info.role);
}

export const SF_DEFAULT_SHARE_ROLE: SFProjectRole = SFProjectRole.CommunityChecker;
export const SF_DEFAULT_TRANSLATE_SHARE_ROLE: SFProjectRole = SFProjectRole.Viewer;
