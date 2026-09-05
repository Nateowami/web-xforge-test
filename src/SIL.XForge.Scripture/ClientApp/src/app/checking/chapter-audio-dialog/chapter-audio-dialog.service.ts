import { Injectable } from '@angular/core';
import { MatDialogConfig } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { CommandError, CommandErrorCode } from 'xforge-common/command.service';
import { DialogService } from 'xforge-common/dialog.service';
import { SFProjectService } from '../../core/sf-project.service';
import {
  ChapterAudioDialogComponent,
  ChapterAudioDialogData,
  ChapterAudioDialogResult
} from './chapter-audio-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ChapterAudioDialogService {
  constructor(
    private readonly dialogService: DialogService,
    private readonly projectService: SFProjectService
  ) {}

  async openDialog(config: ChapterAudioDialogData): Promise<void> {
    const dialogConfig: MatDialogConfig<ChapterAudioDialogData> = {
      data: config,
      width: '320px'
    };
    const dialogRef = this.dialogService.openMatDialog(ChapterAudioDialogComponent, dialogConfig);
    const result: ChapterAudioDialogResult | 'close' | undefined = await firstValueFrom(dialogRef.afterClosed());
    if (result == null || result === 'close') {
      return;
    }
    try {
      await this.projectService.onlineCreateAudioTimingData(
        config.projectId,
        result.book,
        result.chapter,
        result.timingData,
        result.audioUrl
      );
    } catch (error) {
      // The user's permission to manage audio can be revoked while the dialog is open
      if (error instanceof CommandError && error.code === CommandErrorCode.Forbidden) {
        await this.dialogService.message('chapter_audio_dialog.audio_permission_denied');
        return;
      }
      throw error;
    }
  }
}
