import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogClose, MatDialogContent } from '@angular/material/dialog';
import { TranslocoService } from '@ngneat/transloco';
import { LocaleDirection } from 'xforge-common/models/i18n-locale';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { Dir } from '@angular/cdk/bidi';

export enum TextNoteType {
  Footnote = 'f',
  ExtendedFootnote = 'ef',
  EndNote = 'fe',
  CrossReference = 'x',
  ExtendedCrossReference = 'ex'
}

export interface NoteDialogData {
  type: TextNoteType;
  text: string;
  isRightToLeft: boolean;
}

/** A run of note text, which is a web address if url is set. */
export interface NoteTextSegment {
  text: string;
  url?: string;
}

// Matches web addresses, excluding trailing punctuation that is more likely to end the sentence than the address
const URL_REGEX = /\b(?:https?:\/\/|www\.)[^\s<>"]*[^\s<>".,;:!?'()[\]]/gi;

@Component({
  templateUrl: './text-note-dialog.component.html',
  styleUrls: ['./text-note-dialog.component.scss'],
  imports: [MatDialogTitle, MatIconButton, MatDialogClose, MatIcon, CdkScrollable, MatDialogContent, Dir]
})
export class TextNoteDialogComponent {
  readonly segments: NoteTextSegment[];

  constructor(
    @Inject(MAT_DIALOG_DATA) private readonly data: NoteDialogData,
    private readonly translocoService: TranslocoService
  ) {
    this.segments = splitUrls(data.text ?? '');
  }

  get direction(): LocaleDirection {
    return this.data.isRightToLeft ? 'rtl' : 'ltr';
  }

  get type(): string {
    let translateKey = this.data.type.toString();
    switch (this.data.type) {
      case TextNoteType.Footnote:
      case TextNoteType.ExtendedFootnote:
        translateKey = 'footnote';
        break;
      case TextNoteType.EndNote:
        translateKey = 'end_note';
        break;
      case TextNoteType.CrossReference:
      case TextNoteType.ExtendedCrossReference:
        translateKey = 'cross_reference';
    }
    return this.translocoService.translate(`text_note_dialog.${translateKey}`);
  }
}

/** Splits text so that web addresses can be displayed as links. */
export function splitUrls(text: string): NoteTextSegment[] {
  const segments: NoteTextSegment[] = [];
  let index = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    if (match.index > index) segments.push({ text: text.substring(index, match.index) });
    const url: string = match[0];
    segments.push({ text: url, url: url.toLowerCase().startsWith('www.') ? `https://${url}` : url });
    index = match.index + url.length;
  }
  if (index < text.length) segments.push({ text: text.substring(index) });
  return segments;
}
