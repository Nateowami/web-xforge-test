import { obj, PathItem } from 'realtime-server/lib/esm/common/utils/obj-path';
import { Answer } from 'realtime-server/lib/esm/scriptureforge/models/answer';
import {
  Question,
  QUESTION_INDEX_PATHS,
  QUESTIONS_COLLECTION
} from 'realtime-server/lib/esm/scriptureforge/models/question';
import { FileService } from 'xforge-common/file.service';
import { FileType } from 'xforge-common/models/file-offline-data';
import { ProjectDataDoc } from 'xforge-common/models/project-data-doc';
import { Snapshot } from 'xforge-common/models/snapshot';

/**
 * This is the real-time doc for a community checking question.
 */
export class QuestionDoc extends ProjectDataDoc<Question> {
  static readonly COLLECTION = QUESTIONS_COLLECTION;
  static readonly INDEX_PATHS = QUESTION_INDEX_PATHS;

  alwaysKeepFileOffline(fileType: FileType, dataId: string): boolean {
    return this.data != null && fileType === FileType.Audio && !this.data.isArchived && this.data.dataId === dataId;
  }

  /**
   * Gets the answers for this question that have not been deleted.
   *
   * @param {string} ownerRef If set, this filters by the owner of the answer.
   * @returns The answers as an array.
   */
  getAnswers(ownerRef: string | undefined = undefined): Answer[] {
    return (
      (ownerRef == null
        ? this.data?.answers.filter(a => !a.deleted)
        : this.data?.answers.filter(a => !a.deleted && a.ownerRef === ownerRef)) ?? []
    );
  }

  async updateFileCache(): Promise<void> {
    if (this.realtimeService.fileService == null || this.data == null) {
      return;
    }

    await this.realtimeService.fileService.findOrUpdateCache(
      FileType.Audio,
      this.collection,
      this.data.dataId,
      this.data.isArchived ? undefined : this.data.audioUrl
    );
  }

  async updateAnswerFileCache(): Promise<void> {
    if (this.realtimeService.fileService == null || this.data == null) {
      return;
    }

    for (const answer of this.getAnswers()) {
      await this.realtimeService.fileService.findOrUpdateCache(
        FileType.Audio,
        this.collection,
        answer.dataId,
        answer.audioUrl
      );
    }
  }

  protected getFileUrlPath(fileType: FileType, dataId: string): PathItem[] | undefined {
    if (this.data == null || fileType !== FileType.Audio) {
      return undefined;
    }

    if (this.data.dataId === dataId) {
      // The file belongs to the question
      return obj<Question>().path(q => q.audioUrl);
    } else {
      // otherwise, it is probably belongs to an answer
      const answerIndex = this.data.answers.findIndex(a => a.dataId === dataId && !a.deleted);
      if (answerIndex !== -1) {
        return obj<Question>().path(q => q.answers[answerIndex].audioUrl);
      }
    }
    return undefined;
  }

  async updateOfflineData(force: boolean = false): Promise<void> {
    // Check to see if any answers have been removed by comparing with current offline data
    const fileService: FileService | undefined = this.realtimeService.fileService;
    if (fileService != null) {
      const answers: Answer[] =
        (await this.realtimeService.offlineStore.get<Snapshot<Question>>(this.collection, this.id))?.data.answers || [];
      for (const answer of answers) {
        const file = await fileService.get(FileType.Audio, answer.dataId);
        if (
          file != null &&
          (this.data?.answers.find(a => a.dataId === answer.dataId) == null ||
            this.data?.answers.find(a => a.dataId === answer.dataId)?.deleted)
        ) {
          await fileService.findOrUpdateCache(FileType.Audio, this.collection, answer.dataId);
        }
      }
    }
    await super.updateOfflineData(force);
  }
}
