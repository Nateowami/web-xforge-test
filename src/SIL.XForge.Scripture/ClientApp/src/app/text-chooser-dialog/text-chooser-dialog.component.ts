import { Component, DestroyRef, ElementRef, Inject, Optional, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { VerseRef } from '@sillsdev/scripture';
import { toVerseRef, VerseRefData } from 'realtime-server/lib/esm/scriptureforge/models/verse-ref-data';
import { fromEvent } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { DOCUMENT } from 'xforge-common/browser-globals';
import { DialogService } from 'xforge-common/dialog.service';
import { I18nService } from 'xforge-common/i18n.service';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { TextDocId } from '../core/models/text-doc';
import { TextsByBookId } from '../core/models/texts-by-book-id';
import {
  ScriptureChooserDialogComponent,
  ScriptureChooserDialogData
} from '../scripture-chooser-dialog/scripture-chooser-dialog.component';
import { TextComponent } from '../shared/text/text.component';
export interface TextChooserDialogData {
  bookNum: number;
  chapterNum: number;
  projectId: string;
  textsByBookId: TextsByBookId;
  isRightToLeft?: boolean;
  selectedText?: string;
  selectedVerses?: VerseRefData;
}

export interface TextSelection {
  verses: VerseRefData;
  text: string;
  // whether or not the starting verse was fully selected (useful for knowing whether to show e.g. an ellipsis)
  startClipped: boolean;
  endClipped: boolean;
}

@Component({
  templateUrl: './text-chooser-dialog.component.html',
  styleUrls: ['./text-chooser-dialog.component.scss']
})
export class TextChooserDialogComponent {
  @ViewChild(TextComponent, { read: ElementRef }) scriptureText?: ElementRef;
  selectedText?: string;
  showError = false;
  bookNum: number;
  chapterNum: number;
  textDocId: TextDocId;
  startClipped = false;
  endClipped = false;

  private rawTextSelection = '';
  private selectedVerses?: VerseRefData;
  private selectionChanged = false;
  private readonly verseSegmentSelector = 'usx-segment[data-segment^=verse_]';

  constructor(
    private readonly dialogRef: MatDialogRef<TextChooserDialogComponent>,
    readonly dialogService: DialogService,
    private readonly i18n: I18nService,
    @Inject(DOCUMENT) private readonly document: Document,
    @Optional() @Inject(MAT_DIALOG_DATA) private readonly data: TextChooserDialogData,
    private destroyRef: DestroyRef
  ) {
    // caniuse doesn't have complete data for the selection events api, but testing on BrowserStack shows the event is
    // fired at least as far back as iOS v7 on Safari 7.
    // Edge 42 with EdgeHTML 17 also fires the events.
    // Firefox and Chrome also support it. We can degrade gracefully by getting the selection when the dialog closes.
    fromEvent(this.document, 'selectionchange')
      .pipe(auditTime(100), quietTakeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateSelection());

    this.bookNum = this.data.bookNum;
    this.chapterNum = this.data.chapterNum;
    this.selectedText = this.data.selectedText;
    this.selectedVerses = this.data.selectedVerses;

    this.textDocId = new TextDocId(this.data.projectId, this.bookNum, this.chapterNum);
  }

  get bookName(): string {
    return this.i18n.localizeBook(this.bookNum);
  }

  get isTextRightToLeft(): boolean {
    return this.data.isRightToLeft == null ? false : this.data.isRightToLeft;
  }

  updateSelection(): void {
    const selection = this.document.getSelection();
    const rawSelection = (selection || '').toString();
    if (selection != null && rawSelection.trim() !== '' && rawSelection !== this.rawTextSelection) {
      // all non-empty verse elements in the selection
      const segments = Array.from(this.getSegments()).filter(segment => selection.containsNode(segment, true));

      if (segments.filter(segment => segment.querySelector('usx-blank') == null).length === 0) {
        return;
      }

      const expansion = this.expandSelection(selection, segments);
      if (expansion.result === '') {
        return;
      }
      this.selectedText = expansion.result;
      this.startClipped = expansion.startClipped;
      this.endClipped = expansion.endClipped;
      const firstVerseNum = expansion.firstVerseNum;
      const lastVerseNum = expansion.lastVerseNum;

      this.selectedVerses = {
        bookNum: this.bookNum,
        chapterNum: this.chapterNum,
        verseNum: firstVerseNum,
        verse: firstVerseNum === lastVerseNum ? firstVerseNum.toString() : firstVerseNum + '-' + lastVerseNum
      };
      this.rawTextSelection = rawSelection;
      this.selectionChanged = true;
      this.showError = false;
    }
  }

  openScriptureChooser(): void {
    const dialogConfig: MatDialogConfig<ScriptureChooserDialogData> = {
      data: { booksAndChaptersToShow: this.data.textsByBookId, includeVerseSelection: false }
    };

    const dialogRef = this.dialogService.openMatDialog(ScriptureChooserDialogComponent, dialogConfig) as MatDialogRef<
      ScriptureChooserDialogComponent,
      VerseRef | 'close'
    >;
    dialogRef.afterClosed().subscribe(result => {
      if (result != null && result !== 'close') {
        this.bookNum = result.bookNum;
        this.chapterNum = result.chapterNum;
        this.textDocId = new TextDocId(this.data.projectId, this.bookNum, this.chapterNum);
      }
    });
  }

  get referenceForDisplay(): string {
    return this.selectedVerses ? `(${this.i18n.localizeReference(toVerseRef(this.selectedVerses))})` : '';
  }

  submit(): void {
    this.updateSelection();
    if (this.selectedVerses != null) {
      if (this.selectionChanged) {
        const selection: TextSelection = {
          verses: this.selectedVerses,
          text: this.selectedText!,
          startClipped: this.startClipped,
          endClipped: this.endClipped
        };
        this.dialogRef.close(selection);
      } else {
        this.dialogRef.close('close');
      }
    } else {
      this.showError = true;
    }
  }

  /**
   * Calculate where in a segment the selection starts and ends. The selection object (first param, obtained by calling
   * document.getSelection()) specifies where in the DOM the selection starts and ends. Some elements in the DOM (e.g.
   * notes) should not be included in the selection. This function determines at what index in the first and last
   * segment the selection starts and ends, taking into account hidden elements.
   */
  rangeOffsets(selection: Selection, segments: Element[]): { startOffset: number; endOffset: number } {
    // The selection consists of one or more "ranges." Chrome considers the entire selection to be in a single "range",
    // while Firefox looks at it as a number of ranges. We need to find the start of the first range, and the end of the
    // last range, and don't need to be concerned whether there are multiple ranges or not.
    const startRange = selection.getRangeAt(0);
    const endRange = selection.getRangeAt(selection.rangeCount - 1);
    let startOffset = 0;
    const lastSegment = segments[segments.length - 1];
    let endOffset = this.textContent(lastSegment).length;
    if (this.isInASegment(startRange.startContainer)) {
      startOffset = this.textContent(segments[0], startRange.startContainer, startRange.startOffset, false).length;
    }
    if (this.isInASegment(endRange.endContainer)) {
      endOffset = this.textContent(lastSegment, endRange.endContainer, endRange.endOffset, false).length;
    }
    return { startOffset, endOffset };
  }

  /**
   * Get the text content of a node, not including any text in any ignored elements. May optionally find the text up to
   * a dividing point, or after a dividing point, i.e. a specific index of a specific node.
   * @example Calling textContent(mainNode, dividingNode, 2, true) should return "sum dolor" where mainNode is:
   * <span>Lorem <span>ipsum</span> dolor</span>
   * and dividingNode is:
   * <span>ipsum</span>
   * Note: The first parameter is not optional, but the last three are. However, the optional parameters must all be
   * supplied, or none of them supplied.
   * @param mainNode The node to find the text content of
   * @param dividingNode The node at which to start getting text, or stop getting text (optional)
   * @param offset The index in the dividing node at which to start getting text, or stop getting text (optional)
   * @param afterDivider true to fetch the text after the dividing point, false to fetch the text before the dividing
   * point (optional)
   */
  textContent(mainNode: Node, dividingNode?: Node, offset?: number, afterDivider?: boolean): string {
    let includeText = dividingNode == null || afterDivider === false;
    const ignoredTags = ['usx-note'];
    let text = '';
    for (const node of Array.from(mainNode.childNodes)) {
      const isTextNode = node.nodeType === node.TEXT_NODE;
      const tagName = node.nodeType === node.ELEMENT_NODE ? (node as Element).tagName.toLowerCase() : '';
      const ignore = ignoredTags.includes(tagName);

      if (dividingNode != null && node.contains(dividingNode)) {
        if (!ignore && node.isSameNode(dividingNode)) {
          text += afterDivider ? node.textContent!.substring(offset!) : node.textContent!.substring(0, offset);
        } else if (!ignore) {
          text += this.textContent(node, dividingNode, offset, afterDivider);
        }
        includeText = afterDivider!;
      } else if (includeText) {
        if (isTextNode) {
          text += node.textContent;
        } else if (tagName !== '' && !ignore) {
          text += this.textContent(node);
        }
      }
    }
    return text;
  }

  /**
   * Given the user's selection and the USX segment dom elements that are part of the selection:
   * - Expands the selection to the nearest word boundaries
   * - Determines whether the start and end verses were clipped, so that e.g. ellipses can be displayed at the start
   *   and/or end the selection. If only white space was clipped it is not counted as being clipped.
   * - Normalizes whitespace between segments to a single space.
   */
  private expandSelection(
    selection: Selection,
    segments: Element[]
  ): {
    startClipped: boolean;
    endClipped: boolean;
    firstVerseNum: number;
    lastVerseNum: number;
    result: string;
  } {
    // All selected segments except the first and last. The portions of the first and last segments that were selected
    // will be determined, and then concatenated, like so:
    // [selected part of first segment] + [segments in the middle that were fully selected].
    //   + [selected part of last segment]
    // We are dealing with segments here, NOT verses
    const centralSelection = segments
      // Filter for the elements that are not first and last, because those could be only partially selected
      .filter((_el, index) => index !== 0 && index !== segments.length - 1)
      // Trim white space because some segments may end with it and others may not
      .map(el => this.textContent(el).trim())
      // discard any segments that were only whitespace
      .filter(s => s !== '')
      // Join with a single space to finish normalizing white space
      .join(' ');

    // The selection object comes from document.getSelection() and tells us about the selected text in the document.
    // The selection object can tell us exactly what text the user selected, but that's not very helpful, because if the
    // user selected part of a word we want to count the entire word as having been selected. Also, Chrome includes the
    // verse numbers in the selection, and Firefox does not. Instead, we want to use the selection object to determine
    // where the user's selection starts and ends, and then determine on our own what text should be considered
    // selected.

    // The startOffset is the number of characters into the first segment where the selection starts, endOffset the
    // number of characters into the last segment where the selection ends
    const { startOffset, endOffset } = this.rangeOffsets(selection, segments);

    // the full text of the first and last segments of the selection
    const startNodeText = this.textContent(segments[0]);
    const endNodeText = this.textContent(segments[segments.length - 1]);
    // the portion of the text in the starting and ending segment that was actually selected
    const startText = startNodeText.substring(startOffset);
    const endText = endNodeText.substring(0, endOffset);

    // Now we need to expand the selection to encompass partially selected words, or trim the selection of white space.
    // startTrimLength indicates how many characters should be trimmed from the selection, and can be positive (when
    // whitespace is trimmed), or negative (when the selection is expanded to a word boundary, rather than trimmed).
    // Start by trimming any white space from the left side (Specifically, trim from the start of the string, which
    // would be the right side of a rtl language).
    let startTrimLength = startText.length - startText.trimStart().length;
    // If there was no white space to be trimmed, and more than zero characters were selected in the segment, then the
    // selection should be expanded to the nearest word boundary.
    if (startTrimLength === 0 && startText !== '') {
      // [\s\S] matches ANY character including \n, unlike .
      // Find the last word boundary before (or at) the start of the selection.
      // This works because * is greedy, causing [\s\S]* to match the entire string, then backtrack to find a match for
      // the rest of the regex.
      // \b only works for finding word boundaries in Roman scripts, so rather than using that, we look for:
      // zero width space (\u200B), which is not counted as a whitespace character, OR any whitespace character (\s), OR
      // the start of the string, OR (for good measure) a word boundary (\b) FOLLOWED BY any character. That
      // "any character" is in a lookahead, so it doesn't count to the length of the match. The length of the match will
      // be the index of the last word to start before (or at) the point where the selection starts. So if the segment
      // is "here be dragons" and the selection starts at index 6 (between "b" and "e") it will match "here " with a
      // lookahead at "b", and we will expand the selection to "be dragons". Alternatively, if the index is at 5, it
      // doesn't need to be expanded, but in order for the regex to find the word boundary where the word "be" starts,
      // the letter "b" needs to be included in the search string. So the search string always contains one character
      // past the start of the selection: startNodeText.substring(0, startOffset + 1)
      // Because of the lookahead at the end of the regex, that character will never end up in the matched string.
      // Finally we have to subtract startOffset from the result, because startTrimLength is relative to the start of
      // the selection, not the start of the segment. This will result in a negative value for startTrimLength, meaning
      // add to the start, rather than trim.
      startTrimLength =
        /[\s\S]*(?:\u200B|\b|\s|^)(?=[\s\S])/.exec(startNodeText.substring(0, startOffset + 1))![0].length -
        startOffset;
    }
    // Trim any whitespace from the right side of the selection
    let endTrimLength = endText.length - endText.trimEnd().length;
    // If there was no whitespace to trim, and more than zero characters were selected in the segment, then the
    // selection should be expanded to the first word boundary after the end of the selection.
    if (endTrimLength === 0 && endText !== '') {
      // In the regex above, we wanted to find the last word boundary in a string, so we matched from the beginning of
      // the string to the last word boundary, and used the length of the match to get the index. Here we want to find
      // the first word boundary after the end of the selection, so we can use String.search(regex).
      // To find a word boundary we look for any character, followed by a zero width space, OR whitespace, OR a word
      // boundary, OR the end of the string. As before, we have to include an extra character so that it's possible to
      // detect a word boundary right at the end of the selection. Hence the substring we search is
      // endNodeText.substring(endOffset - 1)
      // This yields the number of chars to expand beyond the end of the selection, which is made negative to create
      // a negative trim length.
      endTrimLength = -endNodeText.substring(endOffset - 1).search(/[\s\S](?:\u200B|\b|\s|$)/);
    }

    // Set result to the complete text of all segments in the selection. This is the first segment, plus any segments
    // between the first and last, plus the last, EXCEPT when the first and the last segment are the same segment, in
    // which case there will be zero segments between them (centralSelection will be the empty string), and the single
    // segment should not be included a second time
    let result = [startNodeText, centralSelection, segments.length === 1 ? '' : endNodeText]
      .filter(s => s !== '')
      .join(' ');
    // Trim the final string by the selection offset, offset by the trim length. So if selection starts at index 3, and
    // startTrimLength is 2, then take 5 chars off the beginning. Alternatively, startTrimLength could be negative,
    // causing startOffset + startTrimLength to be as little as 0. The end offset is a bit trickier, but we can use
    // result.length - endNodeText.length to find the index where the last segment starts, and then count from there.
    result = result
      .substring(startOffset + startTrimLength, result.length - endNodeText.length + endOffset - endTrimLength)
      .trim();

    // We want to be able to show ellipses at the start or end of the selection if the selection doesn't start at the
    // beginning or end at the end of a verse. First determine whether the selection, after being trimmed/expanded,
    // includes the entirety of the first and last segments of the selection. If only whitespace is missed, consider
    // that the segment was fully selected.
    const startSegmentLeadingWhitespaceLength = startNodeText.length - startNodeText.trimStart().length;
    const startSegmentClipped = startOffset + startTrimLength > startSegmentLeadingWhitespaceLength;
    const endSegmentLengthWithoutTrailingWhitespace = endNodeText.trimEnd().length;
    const endSegmentClipped = endOffset - endTrimLength < endSegmentLengthWithoutTrailingWhitespace;

    // Even if the entirety of the first or last segment was selected, it's possible that segment isn't the only segment
    // for that verse. Assemble a list of segments that are in the same verse as the selection's first segment's verse.
    // Filter out those that have only white space.
    const firstVerseSegments = Array.from(this.getSegments(this.getVerseFromElement(segments[0]))).filter(
      el => this.textContent(el).trim() !== ''
    );
    const lastVerseSegments = Array.from(
      this.getSegments(this.getVerseFromElement(segments[segments.length - 1]))
    ).filter(el => this.textContent(el).trim() !== '');

    // Determine whether ellipses should be shown before the selected text. If some but not all of the first
    // segment has been selected, then only part of the verse has been selected. If all of the segment was selected,
    // then part of the verse has been selected only if this is not the first segment of the verse. If none of the
    // segment is selected, then part of the verse has been selected only if the next segment corresponds to the same
    // verse.
    const startClipped =
      (startSegmentClipped && startText.trim() !== '') ||
      (!startSegmentClipped && startText.trim() !== '' && !segments[0].isSameNode(firstVerseSegments[0])) ||
      (startText.trim() === '' && firstVerseSegments.some(segment => segment.isSameNode(segments[1])));
    // Determine whether ellipses should be shown after the selected text. If some but not all of the last
    // segment has been selected, then only part of the verse has been selected. If all of the segment was selected,
    // then part of the verse has been selected only if this is not the last segment of the verse. If none of the
    // segment is selected, then part of the verse has been selected only if the previous segment corresponds to the
    // same verse.
    const endClipped =
      (endSegmentClipped && endText.trim() !== '') ||
      (!endSegmentClipped &&
        endText.trim() !== '' &&
        !segments[segments.length - 1].isSameNode(lastVerseSegments[lastVerseSegments.length - 1])) ||
      (endText.trim() === '' && lastVerseSegments.some(segment => segment.isSameNode(segments[segments.length - 2])));

    // Find the range of verses that has been selected. If only whitespace was selected in the first segment, then the
    // selection starts in the next segment, and the starting verse is the verse of that next segment.
    const firstVerseNum =
      startText.trim() === '' && segments.length > 1
        ? this.getVerseFromElement(segments[1])
        : this.getVerseFromElement(segments[0]);
    const lastVerseNum =
      endText.trim() === '' && segments.length > 1
        ? this.getVerseFromElement(segments[segments.length - 2])
        : this.getVerseFromElement(segments[segments.length - 1]);

    return {
      startClipped,
      endClipped,
      firstVerseNum,
      lastVerseNum,
      result
    };
  }

  private getVerseFromElement(element: Element): number {
    return parseInt(element.getAttribute('data-segment')!.split('_', 3)[2], 10);
  }

  private getSegments(verse?: number): Element[] {
    return this.verseSegments().filter(el => (verse == null ? true : verse === this.getVerseFromElement(el)));
  }

  private isInASegment(node: Node): boolean {
    if (this.isVerseSegment(node)) {
      return true;
    } else if (node.parentNode != null) {
      return this.isInASegment(node.parentNode);
    } else {
      return false;
    }
  }

  private isVerseSegment(node: Node): boolean {
    return node.nodeType === node.ELEMENT_NODE && (node as Element).matches(this.verseSegmentSelector);
  }

  private verseSegments(): Element[] {
    if (this.scriptureText == null) {
      return [];
    }
    return Array.from((this.scriptureText.nativeElement as HTMLElement).querySelectorAll(this.verseSegmentSelector));
  }
}
