import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, Inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle
} from '@angular/material/dialog';
import { User } from 'realtime-server/lib/esm/common/models/user';
import { AvatarComponent } from '../avatar/avatar.component';

/** Data passed into the user details dialog. */
export interface SaUserDetailsDialogData {
  user: User;
}

/** Dialog that displays details about a user, including their email address. */
@Component({
  templateUrl: './sa-user-details-dialog.component.html',
  styleUrls: ['./sa-user-details-dialog.component.scss'],
  imports: [MatDialogTitle, CdkScrollable, MatDialogContent, AvatarComponent, MatDialogActions, MatButton, MatDialogClose]
})
export class SaUserDetailsDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: SaUserDetailsDialogData) {}
}
