import { Injectable } from '@angular/core';
import { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { TranslocoService } from '@ngneat/transloco';
import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import { Question } from 'realtime-server/lib/esm/scriptureforge/models/question';
import { SF_PROJECT_RIGHTS, SFProjectDomain } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { fromVerseRef } from 'realtime-server/lib/esm/scriptureforge/models/verse-ref-data';
import { lastValueFrom } from 'rxjs';
import { DialogService } from 'xforge-common/dialog.service';
import { FileType } from 'xforge-common/models/file-offline-data';
import { NoticeService } from 'xforge-common/notice.service';
import { UserService } from 'xforge-common/user.service';
import { QuestionDoc } from '../../core/models/question-doc';
import { SFProjectService } from '../../core/sf-project.service';
import { CheckingQuestionsService } from '../checking/checking-questions.service';
import { QuestionDialogComponent, QuestionDialogData, QuestionDialogResult } from './question-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class QuestionDialogService {
  constructor(
    private readonly dialogService: DialogService,
    private readonly projectService: SFProjectService,
    private readonly checkingQuestionsService: CheckingQuestionsService,
    private readonly userService: UserService,
    private readonly noticeService: NoticeService,
    private readonly transloco: TranslocoService
  ) {}

  /** Opens a question dialog that can be used to add a new question or edit an existing question. */
  async questionDialog(config: QuestionDialogData): Promise<QuestionDoc | undefined> {
    const questionDoc = config.questionDoc;
    const dialogConfig: MatDialogConfig = { data: config, autoFocus: true, disableClose: true };
    const dialogRef = this.dialogService.openMatDialog(QuestionDialogComponent, dialogConfig) as MatDialogRef<
      QuestionDialogComponent,
      QuestionDialogResult | 'close'
    >;
    // The dialog uploads the question audio itself, so that it can report progress and errors while it is open
    const result: QuestionDialogResult | 'close' | undefined = await lastValueFrom(dialogRef.afterClosed());
    if (result == null || result === 'close') {
      return questionDoc;
    }
    if (!(await this.canCreateAndEditQuestions(config.projectId))) {
      this.noticeService.show(this.transloco.translate('question_dialog.add_question_denied'));
      return undefined;
    }
    const questionId = result.questionId;
    const verseRefData = fromVerseRef(result.verseRef);
    const text = result.text;
    const audioUrl = result.audioUrl;

    const currentDate = new Date().toJSON();
    if (questionDoc != null && questionDoc.data != null) {
      const deleteAudio = questionDoc.data.audioUrl != null && audioUrl == null;
      await questionDoc.submitJson0Op(op =>
        op
          .set(q => q.verseRef, verseRefData)
          .set(q => q.text, text)
          .set(q => q.audioUrl, audioUrl)
          .set(q => q.dateModified, currentDate)
      );
      if (deleteAudio) {
        await questionDoc.deleteFile(FileType.Audio, questionDoc.data.dataId, questionDoc.data.ownerRef);
      }
      return questionDoc;
    }
    const newQuestion: Question = {
      dataId: questionId,
      projectRef: config.projectId,
      ownerRef: this.userService.currentUserId,
      verseRef: verseRefData,
      text,
      audioUrl,
      answers: [],
      isArchived: false,
      dateCreated: currentDate,
      dateModified: currentDate
    };
    return await this.checkingQuestionsService.createQuestion(config.projectId, newQuestion);
  }

  private async canCreateAndEditQuestions(projectId: string): Promise<boolean> {
    const userId = this.userService.currentUserId;
    const project = (await this.projectService.getProfile(projectId)).data;
    return (
      project != null &&
      SF_PROJECT_RIGHTS.hasRight(project, userId, SFProjectDomain.Questions, Operation.Create) &&
      SF_PROJECT_RIGHTS.hasRight(project, userId, SFProjectDomain.Questions, Operation.Edit)
    );
  }
}
