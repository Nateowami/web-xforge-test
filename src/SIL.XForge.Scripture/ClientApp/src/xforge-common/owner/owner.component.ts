import { NgClass } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { UserProfile } from 'realtime-server/lib/esm/common/models/user';
import { AuthService } from '../auth.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { DialogService } from '../dialog.service';
import { I18nService } from '../i18n.service';
import { UserDoc } from '../models/user-doc';
import { UserProfileDoc } from '../models/user-profile-doc';
import { UserService } from '../user.service';
import { SaUserDetailsDialogComponent } from '../system-administration/sa-user-details-dialog.component';

@Component({
  selector: 'app-owner',
  templateUrl: './owner.component.html',
  styleUrls: ['./owner.component.scss'],
  imports: [AvatarComponent, NgClass]
})
export class OwnerComponent implements OnInit {
  @Input() ownerRef?: string;
  @Input() includeAvatar: boolean = false;
  @Input() dateTime: string = '';
  @Input() layoutStacked: boolean = false;
  @Input() showTimeZone: boolean = false;
  private ownerDoc?: UserProfileDoc;

  constructor(
    private readonly userService: UserService,
    readonly i18n: I18nService,
    private readonly translocoService: TranslocoService,
    private readonly authService: AuthService,
    private readonly dialogService: DialogService
  ) {}

  get date(): Date {
    return new Date(this.dateTime);
  }

  get name(): string {
    if (this.ownerDoc == null || this.ownerDoc.data == null) {
      return this.translocoService.translate('checking.unknown_author');
    }
    return this.userService.currentUserId === this.ownerDoc.id
      ? this.translocoService.translate('checking.me')
      : this.ownerDoc.data.displayName;
  }

  get owner(): UserProfile | undefined {
    return this.ownerDoc == null ? undefined : this.ownerDoc.data;
  }

  /** Whether the current user has permission to view user details (serval admin or system admin). */
  get canViewUserDetails(): boolean {
    const roles: SystemRole[] = this.authService.currentUserRoles;
    return roles.includes(SystemRole.ServalAdmin) || roles.includes(SystemRole.SystemAdmin);
  }

  async ngOnInit(): Promise<void> {
    if (this.ownerRef != null) {
      this.ownerDoc = await this.userService.getProfile(this.ownerRef);
    }
  }

  /** Open the user details dialog, fetching the full user record. Only available to serval/system admins. */
  async openUserDetails(): Promise<void> {
    if (this.ownerRef == null || !this.canViewUserDetails) {
      return;
    }
    const userDoc: UserDoc = await this.userService.get(this.ownerRef);
    if (userDoc.data != null) {
      this.dialogService.openMatDialog(SaUserDetailsDialogComponent, {
        data: { user: userDoc.data },
        minWidth: '320px'
      });
    }
  }
}
