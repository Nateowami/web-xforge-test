import { Component } from '@angular/core';
import { TranslocoModule } from '@ngneat/transloco';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { AuthService } from 'xforge-common/auth.service';
import { CollaboratorsComponent } from './collaborators/collaborators.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  imports: [TranslocoModule, CollaboratorsComponent]
})
/** Hosts the project users page and configures read-only behavior for Serval admins. */
export class UsersComponent {
  constructor(private readonly authService: AuthService) {}

  get isReadOnly(): boolean {
    return this.authService.currentUserRoles.includes(SystemRole.ServalAdmin);
  }
}
