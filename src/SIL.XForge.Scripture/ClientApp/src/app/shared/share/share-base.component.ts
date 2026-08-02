import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { getUserShareableRoles, SF_PROJECT_ROLES } from '../../core/models/sf-project-role-info';

export abstract class ShareBaseComponent {
  protected projectDoc?: SFProjectProfileDoc;

  constructor(protected readonly userService: UserService) {}

  get availableRoles(): SFProjectRole[] {
    return SF_PROJECT_ROLES.filter(info => info.canBeShared && this.userShareableRoles.includes(info.role)).map(
      r => r.role
    ) as SFProjectRole[];
  }

  protected get userShareableRoles(): SFProjectRole[] {
    const project = this.projectDoc?.data;
    return project == null ? [] : getUserShareableRoles(project, this.userService.currentUserId);
  }
}
