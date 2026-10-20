import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { anything, deepEqual, mock, resetCalls, verify, when } from 'ts-mockito';
import { CommandError, CommandErrorCode } from 'xforge-common/command.service';
import { DialogService } from 'xforge-common/dialog.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { SFProjectService } from '../../core/sf-project.service';
import { ChapterAudioDialogData, ChapterAudioDialogResult } from './chapter-audio-dialog.component';
import { ChapterAudioDialogService } from './chapter-audio-dialog.service';

const mockedDialogService = mock(DialogService);
const mockedProjectService = mock(SFProjectService);

describe('ChapterAudioDialogService', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: DialogService, useMock: mockedDialogService },
      { provide: SFProjectService, useMock: mockedProjectService }
    ]
  }));

  const config: ChapterAudioDialogData = { projectId: 'project01', textsByBookId: {}, questionsSorted: [] };
  const result: ChapterAudioDialogResult = { audioUrl: 'audio url', book: 1, chapter: 2, timingData: [] };

  beforeEach(() => {
    resetCalls(mockedDialogService);
    when(mockedDialogService.openMatDialog(anything(), anything())).thenReturn({
      afterClosed: () => of(result)
    } as any);
    when(mockedDialogService.message(anything())).thenResolve();
  });

  it('saves the chapter audio when the dialog returns a result', async () => {
    when(mockedProjectService.onlineCreateAudioTimingData('project01', 1, 2, deepEqual([]), 'audio url')).thenResolve();

    await TestBed.inject(ChapterAudioDialogService).openDialog(config);

    verify(mockedProjectService.onlineCreateAudioTimingData('project01', 1, 2, deepEqual([]), 'audio url')).once();
    verify(mockedDialogService.message(anything())).never();
  });

  it('shows a permission message if the user can no longer add audio', async () => {
    when(
      mockedProjectService.onlineCreateAudioTimingData(anything(), anything(), anything(), anything(), anything())
    ).thenReject(
      new CommandError(CommandErrorCode.Forbidden, 'The user does not have permission to perform this operation.')
    );

    await TestBed.inject(ChapterAudioDialogService).openDialog(config);

    verify(mockedDialogService.message('chapter_audio_dialog.no_permission')).once();
  });

  it('rethrows other errors', async () => {
    when(
      mockedProjectService.onlineCreateAudioTimingData(anything(), anything(), anything(), anything(), anything())
    ).thenReject(new CommandError(CommandErrorCode.InternalError, 'Internal error'));

    await expectAsync(TestBed.inject(ChapterAudioDialogService).openDialog(config)).toBeRejectedWithError(CommandError);
    verify(mockedDialogService.message(anything())).never();
  });
});
