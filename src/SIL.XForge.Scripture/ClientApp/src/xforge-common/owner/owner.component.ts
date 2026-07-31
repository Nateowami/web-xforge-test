import { NgClass } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { UserProfile } from 'realtime-server/lib/esm/common/models/user';
import { AvatarComponent } from '../avatar/avatar.component';
import { I18nService } from '../i18n.service';
import { UserDoc } from '../models/user-doc';
import { UserProfileDoc } from '../models/user-profile-doc';
import { UserService } from '../user.service';

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
  private currentUserDoc?: UserDoc;

  constructor(
    private readonly userService: UserService,
    readonly i18n: I18nService,
    private readonly translocoService: TranslocoService
  ) {}

  get date(): Date {
    return new Date(this.dateTime);
  }

  get name(): string {
    if (this.isCurrentUser) {
      return this.translocoService.translate('checking.me');
    }
    if (this.ownerDoc?.data == null) {
      return this.translocoService.translate('checking.unknown_author');
    }
    return this.ownerDoc.data.displayName;
  }

  get owner(): UserProfile | undefined {
    return this.isCurrentUser ? this.currentUserDoc?.data : this.ownerDoc?.data;
  }

  async ngOnInit(): Promise<void> {
    if (this.ownerRef == null) {
      return;
    }
    if (this.isCurrentUser) {
      // Use the current user's own doc rather than their profile doc. A profile doc is only fetched the first time it
      // is needed, and subscribing to a doc that is not in the local store does not complete until the app is online
      // again, whereas the current user's own doc is loaded when the app starts and so is available offline.
      this.currentUserDoc = await this.userService.getCurrentUser();
    } else {
      this.ownerDoc = await this.userService.getProfile(this.ownerRef);
    }
  }

  private get isCurrentUser(): boolean {
    return !!this.ownerRef && this.ownerRef === this.userService.currentUserId;
  }
}
