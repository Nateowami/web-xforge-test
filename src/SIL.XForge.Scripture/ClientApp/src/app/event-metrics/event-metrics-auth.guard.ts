import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { PermissionsService } from '../core/permissions.service';
import { SFProjectService } from '../core/sf-project.service';
import { RouterGuard } from '../shared/project-router.guard';

@Injectable({
  providedIn: 'root'
})
export class EventMetricsAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    private readonly authService: AuthService,
    projectService: SFProjectService,
    permissionsService: PermissionsService,
    router: Router,
    private readonly userService: UserService
  ) {
    super(authGuard, projectService, permissionsService, router);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return (
      this.authService.currentUserRoles.includes(SystemRole.ServalAdmin) ||
      this.authService.currentUserRoles.includes(SystemRole.SystemAdmin) ||
      (projectDoc.data != null &&
        projectDoc.data.userRoles[this.userService.currentUserId] === SFProjectRole.ParatextAdministrator)
    );
  }
}
