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
import { objectId } from 'xforge-common/utils';
import { QuestionDoc } from '../../core/models/question-doc';
import { SFProjectService } from '../../core/sf-project.service';
import { CheckingQuestionsService } from '../checking/checking-questions.service';
import {
  QuestionDialogComponent,
  QuestionDialogComponentData,
  QuestionDialogData,
  QuestionDialogResult
} from './question-dialog.component';

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
    let savedQuestionDoc: QuestionDoc | undefined;
    const data: QuestionDialogComponentData = {
      ...config,
      saveQuestion: async (result: QuestionDialogResult) => {
        savedQuestionDoc = await this.saveQuestion(config, result);
      }
    };
    const dialogConfig: MatDialogConfig = { data, autoFocus: true, disableClose: true };
    const dialogRef = this.dialogService.openMatDialog(QuestionDialogComponent, dialogConfig) as MatDialogRef<
      QuestionDialogComponent,
      QuestionDialogResult | 'close'
    >;
    const result: QuestionDialogResult | 'close' | undefined = await lastValueFrom(dialogRef.afterClosed());
    if (result == null || result === 'close') {
      return config.questionDoc;
    }
    return savedQuestionDoc;
  }

  /** Saves the question, uploading any audio first. Called by the dialog, which stays open until this finishes. */
  private async saveQuestion(
    config: QuestionDialogData,
    result: QuestionDialogResult
  ): Promise<QuestionDoc | undefined> {
    const questionDoc = config.questionDoc;
    if (!(await this.canCreateAndEditQuestions(config.projectId))) {
      this.noticeService.show(this.transloco.translate('question_dialog.add_question_denied'));
      return undefined;
    }
    const questionId = questionDoc != null && questionDoc.data != null ? questionDoc.data.dataId : objectId();
    const verseRefData = fromVerseRef(result.verseRef);
    const text = result.text;
    let audioUrl = questionDoc != null && questionDoc.data != null ? questionDoc.data.audioUrl : undefined;
    if (questionDoc != null && result.audio.fileName != null && result.audio.blob != null) {
      // Get the amended filename and save it against the answer
      const urlResult = await questionDoc.uploadFile(
        FileType.Audio,
        questionId,
        result.audio.blob,
        result.audio.fileName
      );
      if (urlResult == null) {
        // Discard the question if an error occurred while uploading or storing the audio
        // ENHANCE: Keep the dialog open and notify the user instead of discarding the question. For example, see
        // chapter-audio-dialog.component.ts.
        return undefined;
      }
      audioUrl = urlResult;
    } else if (result.audio.status === 'reset') {
      audioUrl = undefined;
    }

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
    return await this.checkingQuestionsService.createQuestion(
      config.projectId,
      newQuestion,
      result.audio.fileName,
      result.audio.blob
    );
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
