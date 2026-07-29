import { Component, Inject } from '@angular/core';
import { UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogConfig,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { I18nService } from 'xforge-common/i18n.service';
import { TranslocoModule } from '@ngneat/transloco';
import { Dir } from '@angular/cdk/bidi';
import { MatIcon } from '@angular/material/icon';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { NoticeComponent } from '../../shared/notice/notice.component';

@Component({
  templateUrl: 'delete-project-dialog.component.html',
  styleUrls: ['delete-project-dialog.component.scss'],
  imports: [
    TranslocoModule,
    Dir,
    MatDialogTitle,
    MatIcon,
    CdkScrollable,
    MatDialogContent,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    ReactiveFormsModule,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    NoticeComponent
  ]
})
export class DeleteProjectDialogComponent {
  static defaultMatDialogConfig: MatDialogConfig = { autoFocus: true };

  projectNameEntry = new UntypedFormControl('');

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string },
    readonly i18n: I18nService,
    private readonly onlineStatusService: OnlineStatusService
  ) {}

  get isAppOnline(): boolean {
    return this.onlineStatusService.isOnline;
  }

  get deleteDisabled(): boolean {
    // Deleting a project requires the server, so don't let the user try while offline
    return !this.isAppOnline || this.data.name?.toLowerCase() !== this.projectNameEntry.value.toLowerCase();
  }
}
