import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslocoModule } from '@ngneat/transloco';
import { firstValueFrom } from 'rxjs';
import { DialogService } from 'xforge-common/dialog.service';
import { issuesEmailTemplate } from 'xforge-common/utils';
import { BrandingService } from '../../core/branding.service';
import { SFProjectService } from '../../core/sf-project.service';
import { NoticeComponent } from '../notice/notice.component';
import {
  FeedbackSourcePage,
  UserFeedbackDialogComponent,
  UserFeedbackDialogData,
  UserFeedbackDialogResult
} from './user-feedback-dialog.component';

@Component({
  selector: 'app-user-feedback',
  imports: [NoticeComponent, TranslocoModule, MatIconButton, MatIcon, MatTooltip],
  templateUrl: './user-feedback.component.html',
  styleUrls: ['./user-feedback.component.scss']
})
export class UserFeedbackComponent {
  /** The page the notice is shown on, which determines the message and is recorded with the feedback. */
  @Input() source: FeedbackSourcePage = FeedbackSourcePage.GenerateDraftPage;
  /** Whether to show a button that lets the user dismiss the notice. */
  @HostBinding('class.dismissible') @Input() dismissible: boolean = false;
  @Output() submitted = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  constructor(
    private readonly dialogService: DialogService,
    private readonly projectService: SFProjectService,
    private readonly brandingService: BrandingService
  ) {}

  get siteName(): string {
    return this.brandingService.siteName;
  }

  get isCommunityCheckingPage(): boolean {
    return this.source === FeedbackSourcePage.CommunityCheckingPage;
  }

  get issueMailTo(): string {
    return issuesEmailTemplate();
  }

  async onSendFeedback(): Promise<void> {
    const dialogRef: MatDialogRef<UserFeedbackDialogComponent, UserFeedbackDialogResult | undefined> =
      this.dialogService.openMatDialog<UserFeedbackDialogComponent, UserFeedbackDialogData>(
        UserFeedbackDialogComponent,
        { disableClose: true, data: { source: this.source } }
      );
    const feedback: UserFeedbackDialogResult | undefined = await firstValueFrom(dialogRef.afterClosed());
    if (feedback != null) {
      try {
        await this.projectService.onlineAddUserFeedback(feedback);
        this.submitted.emit();
        void this.dialogService.message('user_feedback.thank_you_for_your_feedback', 'user_feedback.close');
      } catch {
        void this.dialogService.message('user_feedback.error_occurred', 'user_feedback.close');
      }
    }
  }
}
