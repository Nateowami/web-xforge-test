import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { SF_PROJECT_RIGHTS, SFProjectDomain } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { getUserShareableRoles } from './sf-project-role-info';

const userId = 'user01';
const shareRight = SF_PROJECT_RIGHTS.joinRight(SFProjectDomain.UserInvites, Operation.Create);

describe('getUserShareableRoles', () => {
  it('returns no roles when the user cannot invite others', () => {
    const project = createTestProjectProfile({
      userRoles: { [userId]: SFProjectRole.CommunityChecker }
    });
    expect(getUserShareableRoles(project, userId)).toEqual([]);
  });

  it('allows a community checker to share the community checker role', () => {
    const project = createTestProjectProfile({
      userRoles: { [userId]: SFProjectRole.CommunityChecker },
      rolePermissions: { [SFProjectRole.CommunityChecker]: [shareRight] }
    });
    expect(getUserShareableRoles(project, userId)).toEqual([SFProjectRole.CommunityChecker]);
  });

  it('returns no roles for a community checker when community checking is disabled', () => {
    const project = createTestProjectProfile({
      userRoles: { [userId]: SFProjectRole.CommunityChecker },
      rolePermissions: { [SFProjectRole.CommunityChecker]: [shareRight] },
      checkingConfig: { checkingEnabled: false }
    });
    expect(getUserShareableRoles(project, userId)).toEqual([]);
  });

  it('omits the community checker role for an admin when community checking is disabled', () => {
    const project = createTestProjectProfile({
      userRoles: { [userId]: SFProjectRole.ParatextAdministrator },
      checkingConfig: { checkingEnabled: false }
    });
    expect(getUserShareableRoles(project, userId)).toEqual([SFProjectRole.Viewer, SFProjectRole.Commenter]);
  });

  it('allows an admin to share all roles when community checking is enabled', () => {
    const project = createTestProjectProfile({ userRoles: { [userId]: SFProjectRole.ParatextAdministrator } });
    expect(getUserShareableRoles(project, userId)).toEqual([
      SFProjectRole.CommunityChecker,
      SFProjectRole.Viewer,
      SFProjectRole.Commenter
    ]);
  });
});
