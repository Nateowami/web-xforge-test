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

/** A part of the note text, which is a hyperlink if url is set. */
export interface TextNoteSegment {
  text: string;
  url?: string;
}

/** Matches a URL written with a scheme (http or https), or one starting with "www.". */
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s]+/gi;

/** Punctuation that is likely to follow a URL in a sentence, rather than be part of it. */
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?'"]+$/;

@Component({
  templateUrl: './text-note-dialog.component.html',
  styleUrls: ['./text-note-dialog.component.scss'],
  imports: [MatDialogTitle, MatIconButton, MatDialogClose, MatIcon, CdkScrollable, MatDialogContent, Dir]
})
export class TextNoteDialogComponent {
  readonly segments: TextNoteSegment[];

  constructor(
    @Inject(MAT_DIALOG_DATA) private readonly data: NoteDialogData,
    private readonly translocoService: TranslocoService
  ) {
    this.segments = splitTextIntoSegments(this.data.text ?? '');
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

/** Splits note text into plain text and hyperlink segments, so that any URLs in it can be clicked. */
function splitTextIntoSegments(text: string): TextNoteSegment[] {
  const segments: TextNoteSegment[] = [];
  let index = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const url = trimUrl(match[0]);
    if (url === '') {
      continue;
    }
    if (match.index > index) {
      segments.push({ text: text.substring(index, match.index) });
    }
    segments.push({ text: url, url: url.startsWith('www.') ? `https://${url}` : url });
    index = match.index + url.length;
  }
  if (index < text.length) {
    segments.push({ text: text.substring(index) });
  }
  return segments;
}

/** Removes trailing characters that are punctuation of the sentence containing the URL, rather than part of the URL. */
function trimUrl(url: string): string {
  let trimmed = url.replace(TRAILING_PUNCTUATION_REGEX, '');
  // A closing bracket is only part of the URL if the URL also contains the matching opening bracket
  while (/[)\]}]$/.test(trimmed) && countOf(trimmed, openingBracket(trimmed)) < countOf(trimmed, trimmed.slice(-1))) {
    trimmed = trimmed.slice(0, -1).replace(TRAILING_PUNCTUATION_REGEX, '');
  }
  return trimmed;
}

function openingBracket(url: string): string {
  return { ')': '(', ']': '[', '}': '{' }[url.slice(-1)] ?? '';
}

function countOf(text: string, character: string): number {
  return text.split(character).length - 1;
}
