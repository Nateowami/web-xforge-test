import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { UserProfile } from 'realtime-server/lib/esm/common/models/user';
import { AvatarComponent } from '../avatar/avatar.component';
import { I18nService } from '../i18n.service';
import { UserProfileDoc } from '../models/user-profile-doc';
import { UserService } from '../user.service';

@Component({
  selector: 'app-owner',
  templateUrl: './owner.component.html',
  styleUrls: ['./owner.component.scss'],
  imports: [AvatarComponent, NgClass]
})
export class OwnerComponent {
  @Input() includeAvatar: boolean = false;
  @Input() dateTime: string = '';
  @Input() layoutStacked: boolean = false;
  @Input() showTimeZone: boolean = false;
  private _ownerRef?: string;
  private ownerDoc?: UserProfileDoc;

  constructor(
    private readonly userService: UserService,
    readonly i18n: I18nService,
    private readonly translocoService: TranslocoService
  ) {}

  @Input() set ownerRef(value: string | undefined) {
    this._ownerRef = value;
    // Reload on every change, not only on init, so that a reused component does not keep showing the previous owner
    this.ownerDoc = undefined;
    void this.loadOwner(value);
  }

  get ownerRef(): string | undefined {
    return this._ownerRef;
  }

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

  private async loadOwner(ownerRef: string | undefined): Promise<void> {
    if (ownerRef == null) return;
    const ownerDoc: UserProfileDoc = await this.userService.getProfile(ownerRef);
    // Ignore a profile that arrives after ownerRef has already changed again
    if (ownerRef === this._ownerRef) {
      this.ownerDoc = ownerDoc;
    }
  }
}
