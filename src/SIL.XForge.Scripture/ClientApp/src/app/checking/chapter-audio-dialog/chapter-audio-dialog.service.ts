import { Injectable } from '@angular/core';
import { MatDialogConfig } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { DialogService } from 'xforge-common/dialog.service';
import { ChapterAudioDialogComponent, ChapterAudioDialogData } from './chapter-audio-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ChapterAudioDialogService {
  constructor(private readonly dialogService: DialogService) {}

  async openDialog(config: ChapterAudioDialogData): Promise<void> {
    const dialogConfig: MatDialogConfig<ChapterAudioDialogData> = {
      data: config,
      width: '320px'
    };
    const dialogRef = this.dialogService.openMatDialog(ChapterAudioDialogComponent, dialogConfig);
    // The dialog saves the audio and timing data itself, so that a failure can be reported while the dialog is still
    // open and the user's files are still attached.
    await firstValueFrom(dialogRef.afterClosed());
  }
}
