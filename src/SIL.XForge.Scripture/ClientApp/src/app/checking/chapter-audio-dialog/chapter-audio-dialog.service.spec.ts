import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { CommandError, CommandErrorCode } from 'xforge-common/command.service';
import { DialogService } from 'xforge-common/dialog.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { SFProjectService } from '../../core/sf-project.service';
import {
  ChapterAudioDialogComponent,
  ChapterAudioDialogData,
  ChapterAudioDialogResult
} from './chapter-audio-dialog.component';
import { ChapterAudioDialogService } from './chapter-audio-dialog.service';

const mockedDialogService = mock(DialogService);
const mockedProjectService = mock(SFProjectService);

describe('ChapterAudioDialogService', () => {
  configureTestingModule(() => ({
    imports: [getTestTranslocoModule(false)],
    providers: [
      { provide: DialogService, useMock: mockedDialogService },
      { provide: SFProjectService, useMock: mockedProjectService }
    ]
  }));

  it('creates the audio timing data the dialog returned', async () => {
    const env = new TestEnvironment();
    await env.service.openDialog(env.dialogData);
    verify(mockedProjectService.onlineCreateAudioTimingData('project01', 40, 1, anything(), 'audio url')).once();
    expect().nothing();
  });

  it('shows a message rather than an error if permission was revoked while the dialog was open', async () => {
    const env = new TestEnvironment();
    when(mockedProjectService.onlineCreateAudioTimingData('project01', 40, 1, anything(), 'audio url')).thenReject(
      new CommandError(CommandErrorCode.Forbidden, 'The user does not have permission to perform this operation.')
    );

    await env.service.openDialog(env.dialogData);

    verify(mockedDialogService.message('chapter_audio_dialog.audio_permission_denied')).once();
    expect().nothing();
  });
});

class TestEnvironment {
  readonly service: ChapterAudioDialogService = TestBed.inject(ChapterAudioDialogService);
  readonly mockedDialogRef = mock<MatDialogRef<ChapterAudioDialogComponent, ChapterAudioDialogResult>>(MatDialogRef);
  readonly dialogData: ChapterAudioDialogData = {
    projectId: 'project01',
    textsByBookId: {},
    questionsSorted: []
  };

  constructor() {
    const result: ChapterAudioDialogResult = {
      audioUrl: 'audio url',
      book: 40,
      chapter: 1,
      timingData: [{ textRef: 'v1', from: 0, to: 1 }]
    };
    when(this.mockedDialogRef.afterClosed()).thenReturn(of(result));
    when(mockedDialogService.openMatDialog(ChapterAudioDialogComponent, anything())).thenReturn(
      instance(this.mockedDialogRef)
    );
  }
}
