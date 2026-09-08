import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, DestroyRef, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogConfig,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@ngneat/transloco';
import { VerseRef } from '@sillsdev/scripture';
import { cloneDeep } from 'lodash-es';
import { getQuestionDocId, Question } from 'realtime-server/lib/esm/scriptureforge/models/question';
import { toStartAndEndVerseRefs } from 'realtime-server/lib/esm/scriptureforge/models/verse-ref-data';
import { DialogService } from 'xforge-common/dialog.service';
import { FileService } from 'xforge-common/file.service';
import { I18nService } from 'xforge-common/i18n.service';
import { FileType } from 'xforge-common/models/file-offline-data';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { objectId } from 'xforge-common/utils';
import { QuestionDoc } from '../../core/models/question-doc';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { TextDocId } from '../../core/models/text-doc';
import { TextsByBookId } from '../../core/models/texts-by-book-id';
import {
  ScriptureChooserDialogComponent,
  ScriptureChooserDialogData
} from '../../scripture-chooser-dialog/scripture-chooser-dialog.component';
import { ParentAndStartErrorStateMatcher, SFValidators } from '../../shared/sfvalidators';
import { combineVerseRefStrs } from '../../shared/verse-utils';
import { AttachAudioComponent } from '../attach-audio/attach-audio.component';
import { AudioAttachment } from '../checking/checking-audio-player/checking-audio-player.component';
import { CheckingTextComponent } from '../checking/checking-text/checking-text.component';
import { TextAndAudioComponent } from '../text-and-audio/text-and-audio.component';
export interface QuestionDialogData {
  questionDoc?: QuestionDoc;
  projectDoc: SFProjectProfileDoc;
  textsByBookId: TextsByBookId;
  projectId: string;
  defaultVerse?: VerseRef;
  isRightToLeft?: boolean;
}

export interface QuestionDialogResult {
  verseRef: VerseRef;
  text: string;
  /** The data id of the question, which is also the data id of its audio file. */
  questionId: string;
  /** The url of the question audio, or undefined if the question has no audio. */
  audioUrl?: string;
}

@Component({
  templateUrl: './question-dialog.component.html',
  styleUrls: ['./question-dialog.component.scss'],
  imports: [
    TranslocoModule,
    MatDialogTitle,
    MatIcon,
    CdkScrollable,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatIconButton,
    MatSuffix,
    MatError,
    CheckingTextComponent,
    TextAndAudioComponent,
    AttachAudioComponent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    MatProgressSpinner
  ]
})
export class QuestionDialogComponent implements OnInit {
  @ViewChild(TextAndAudioComponent) textAndAudio?: TextAndAudioComponent;
  modeLabel =
    this.data && this.data.questionDoc != null
      ? this.i18n.translateStatic('question_dialog.edit_question')
      : this.i18n.translateStatic('question_dialog.new_question');
  parentAndStartMatcher = new ParentAndStartErrorStateMatcher();
  versesForm: FormGroup = new FormGroup(
    {
      scriptureStart: new FormControl('', [Validators.required, SFValidators.verseStr(this.data.textsByBookId)]),
      scriptureEnd: new FormControl('', [SFValidators.verseStr(this.data.textsByBookId)])
    },
    SFValidators.verseStartBeforeEnd
  );
  _selection?: VerseRef;

  private _question: Readonly<Question | undefined>;
  private _isSaving: boolean = false;

  constructor(
    private readonly dialogRef: MatDialogRef<QuestionDialogComponent, QuestionDialogResult | 'close'>,
    @Inject(MAT_DIALOG_DATA) private data: QuestionDialogData,
    readonly i18n: I18nService,
    readonly dialogService: DialogService,
    private readonly fileService: FileService,
    private readonly destroyRef: DestroyRef
  ) {}

  get scriptureStart(): AbstractControl {
    return this.versesForm.controls.scriptureStart;
  }

  get scriptureEnd(): AbstractControl {
    return this.versesForm.controls.scriptureEnd;
  }

  get question(): Readonly<Question | undefined> {
    return this._question;
  }

  get textDocId(): TextDocId | undefined {
    if (this.scriptureStart.value && this.scriptureStart.valid) {
      const verseData = new VerseRef(this.scriptureStart.value);
      return new TextDocId(this.data.projectId, verseData.bookNum, verseData.chapterNum);
    }
    return undefined;
  }

  get selection(): VerseRef | undefined {
    return this._selection;
  }

  get scriptureInputErrorMessages(): { startError: string; endError: string } {
    let start: string = this.i18n.translateStatic('question_dialog.required_with_asterisk');
    if (this.scriptureStart.hasError('verseFormat')) {
      start = this.i18n.translateStatic('question_dialog.example_verse');
    } else if (this.scriptureStart.hasError('verseRange')) {
      start = this.i18n.translateStatic('question_dialog.must_be_inside_verse_range');
    }
    let end: string = '';
    if (this.scriptureEnd.hasError('verseFormat')) {
      end = this.i18n.translateStatic('question_dialog.example_verse');
    } else if (this.scriptureEnd.hasError('verseRange')) {
      end = this.i18n.translateStatic('question_dialog.must_be_inside_verse_range');
    } else if (this.versesForm.hasError('verseDifferentBookOrChapter')) {
      end = this.i18n.translateStatic('question_dialog.must_be_same_book_and_chapter');
    }
    return { startError: start, endError: end };
  }

  get isTextRightToLeft(): boolean {
    return this.data.isRightToLeft == null ? false : this.data.isRightToLeft;
  }

  get projectDoc(): SFProjectProfileDoc {
    return this.data.projectDoc;
  }

  /** Whether the question is being saved, which includes uploading its audio. */
  get isSaving(): boolean {
    return this._isSaving;
  }

  ngOnInit(): void {
    this._question = cloneDeep(this.data.questionDoc?.data);
    if (this._question != null) {
      const { startVerseRef, endVerseRef } = toStartAndEndVerseRefs(this._question.verseRef);
      this.scriptureStart.setValue(startVerseRef.toString());
      if (endVerseRef != null) {
        this.scriptureEnd.setValue(endVerseRef.toString());
      }
      this.updateSelection();
    } else if (this.data.defaultVerse != null && this.data.defaultVerse.bookNum > 0) {
      const { startVerseRef, endVerseRef } = toStartAndEndVerseRefs(this.data.defaultVerse);
      this.scriptureStart.setValue(startVerseRef.toString());
      if (endVerseRef != null) {
        this.scriptureEnd.setValue(endVerseRef.toString());
      }
      this.updateSelection();
    }
    // set initial enabled/disabled state for scriptureEnd
    this.updateScriptureEndEnabled();

    this.scriptureStart.valueChanges.pipe(quietTakeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.scriptureStart.valid) {
        this.updateSelection();
      } else {
        this._selection = undefined;
      }
      // update enabled/disabled state for scriptureEnd
      this.updateScriptureEndEnabled();
    });
    this.scriptureEnd.valueChanges.pipe(quietTakeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.scriptureEnd.valid) {
        this.updateSelection();
      } else {
        this._selection = undefined;
      }
    });
  }

  updateSelection(): void {
    this._selection = combineVerseRefStrs(this.scriptureStart.value, this.scriptureEnd.value);
  }

  updateScriptureEndEnabled(): void {
    this.scriptureStart.valid ? this.scriptureEnd.enable() : this.scriptureEnd.disable();
  }

  async submit(): Promise<void> {
    if (this._isSaving) {
      return;
    }
    if (this.textAndAudio != null) {
      this.textAndAudio.suppressErrors = false;
    }
    if (!this.textAndAudio?.hasTextOrAudio()) {
      this.textAndAudio?.text.markAsTouched();
      this.textAndAudio?.text.setErrors({ invalid: true });
      return;
    }

    if (this.versesForm.invalid || this._selection == null) {
      return;
    }

    const questionId: string = this.data.questionDoc?.data?.dataId ?? objectId();
    const audio: AudioAttachment = this.textAndAudio.audioAttachment ?? {};
    let audioUrl: string | undefined = this.data.questionDoc?.data?.audioUrl;
    if (audio.blob != null && audio.fileName != null) {
      // Uploading the audio can take a while, so keep the dialog open, and showing progress, until it is done
      this._isSaving = true;
      try {
        audioUrl = await this.uploadAudio(questionId, audio.blob, audio.fileName);
      } finally {
        this._isSaving = false;
      }
      if (audioUrl == null) {
        // Keep the dialog open so that the question is not lost if the audio could not be uploaded or stored
        await this.dialogService.message('question_dialog.audio_upload_failed');
        return;
      }
    } else if (audio.status === 'reset') {
      audioUrl = undefined;
    }

    this.dialogRef.close({ verseRef: this._selection, text: this.textAndAudio.text.value, questionId, audioUrl });
  }

  private uploadAudio(questionId: string, blob: Blob, fileName: string): Promise<string | undefined> {
    const questionDoc: QuestionDoc | undefined = this.data.questionDoc;
    if (questionDoc != null) {
      return questionDoc.uploadFile(FileType.Audio, questionId, blob, fileName);
    }
    // The question does not exist yet, so upload the audio against the document it will be created as
    return this.fileService.uploadFile(
      FileType.Audio,
      this.data.projectId,
      QuestionDoc.COLLECTION,
      questionId,
      getQuestionDocId(this.data.projectId, questionId),
      blob,
      fileName,
      true
    );
  }

  /** Edit text of control using Scripture chooser dialog. */
  openScriptureChooser(control: AbstractControl): void {
    let currentVerseSelection: VerseRef | undefined;
    const { verseRef } = VerseRef.tryParse(control.value);
    if (verseRef.valid) {
      currentVerseSelection = verseRef;
    }

    let rangeStart: VerseRef | undefined;
    if (control !== this.scriptureStart) {
      const { verseRef: scriptureStartRef } = VerseRef.tryParse(this.scriptureStart.value);
      if (scriptureStartRef.valid) {
        rangeStart = scriptureStartRef;
      }
    }

    const dialogConfig: MatDialogConfig<ScriptureChooserDialogData> = {
      data: { input: currentVerseSelection, booksAndChaptersToShow: this.data.textsByBookId, rangeStart }
    };

    const dialogRef = this.dialogService.openMatDialog(ScriptureChooserDialogComponent, dialogConfig) as MatDialogRef<
      ScriptureChooserDialogComponent,
      VerseRef | 'close'
    >;
    if (control.value === '') {
      // the input element is losing focus, but the input is still being interacted with, so errors shouldn't be shown
      dialogRef.afterOpened().subscribe(() => {
        control.markAsUntouched();
      });
    }
    dialogRef.afterClosed().subscribe(result => {
      control.markAsTouched();
      if (result != null && result !== 'close') {
        control.markAsDirty();
        control.setValue(result.toString());
      }
    });
  }
}
