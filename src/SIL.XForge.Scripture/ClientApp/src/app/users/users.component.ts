import { Component } from '@angular/core';
import { TranslocoModule } from '@ngneat/transloco';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { ActivatedProjectService } from 'xforge-common/activated-project.service';
import { AuthService } from 'xforge-common/auth.service';
import { UserService } from 'xforge-common/user.service';
import { NoticeComponent } from '../shared/notice/notice.component';
import { CollaboratorsComponent } from './collaborators/collaborators.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  imports: [TranslocoModule, NoticeComponent, CollaboratorsComponent]
})
/** Hosts the project users page and configures read-only behavior for Serval admins. */
export class UsersComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly activatedProjectService: ActivatedProjectService
  ) {}

  get isReadOnly(): boolean {
    if (!this.authService.currentUserRoles.includes(SystemRole.ServalAdmin)) return false;
    const userId: string | undefined = this.userService.currentUserId;
    if (userId == null) return true;
    // If the user is also a project admin, they can use the page normally rather than as read-only
    return this.activatedProjectService.projectDoc?.data?.userRoles?.[userId] !== SFProjectRole.ParatextAdministrator;
  }
}
