import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import { Canon, VerseRef } from '@sillsdev/scripture';
import { I18nService } from 'xforge-common/i18n.service';
import { TextDocId } from '../core/models/text-doc';
import { TextsByBookId } from '../core/models/texts-by-book-id';
import { SFProjectService } from '../core/sf-project.service';

export interface ScriptureChooserDialogData {
  /** Starting verse selection, to highlight */
  input?: VerseRef;

  /** Set of books and chapters to make available for selection */
  booksAndChaptersToShow: TextsByBookId;

  /** Starting verse of a range, that this dialog will be used to select the end
   *  of. If present, the dialog will only show a verse picker, for the start
   *  verse and verses following thru the end of the chapter.
   *  A value of null or undefined will cause normal dialog behaviour of
   *  book,chapter,verse selection. */
  rangeStart?: VerseRef;

  /** Can be used to exclude the selection of verses - useful for when only
   *  wanting to return a book and chapter.
   */
  includeVerseSelection?: boolean;

  /** Project whose chapter texts say which verses exist. Without it, every verse through the last
   *  verse of a chapter is offered, including any that the text skips. */
  projectId?: string;
}

/** Dialog to allow selection of a particular Scripture reference. */
@Component({
  selector: 'app-scripture-reference-chooser',
  templateUrl: './scripture-chooser-dialog.component.html',
  styleUrls: ['./scripture-chooser-dialog.component.scss'],
  imports: [TranslocoModule, MatDialogTitle, MatIconButton, MatIcon, CdkScrollable, MatDialogContent, MatButton]
})
export class ScriptureChooserDialogComponent implements OnInit {
  showing: 'books' | 'chapters' | 'verses' | 'rangeEnd' = 'books';
  otBooks: string[] = [];
  ntBooks: string[] = [];
  dcBooks: string[] = [];
  chapters: number[] = [];
  verses: number[] = [];
  closeFocuses: number = 0;

  /** User's selection */
  selection: { book?: string; chapter?: string; verse?: string } = {};

  /** Verses that exist in the chapter currently being shown, if they could be determined. */
  private versesInChapter?: { bookId: string; chapter: number; verses: number[] };

  constructor(
    public dialogRef: MatDialogRef<ScriptureChooserDialogComponent>,
    readonly i18n: I18nService,
    private readonly projectService: SFProjectService,
    @Inject(MAT_DIALOG_DATA) public data: ScriptureChooserDialogData
  ) {}

  get hasOTBooks(): boolean {
    return this.otBooks.length > 0;
  }

  private get hasMultipleBooks(): boolean {
    return this.otBooks.length + this.ntBooks.length > 1;
  }

  ngOnInit(): void {
    const books = Object.keys(this.data.booksAndChaptersToShow);
    this.otBooks = books
      .filter(book => Canon.isBookOT(book))
      .sort((a, b) => Canon.bookIdToNumber(a) - Canon.bookIdToNumber(b));
    this.ntBooks = books
      .filter(book => Canon.isBookNT(book))
      .sort((a, b) => Canon.bookIdToNumber(a) - Canon.bookIdToNumber(b));
    this.dcBooks = books
      .filter(book => Canon.isBookDC(book))
      .sort((a, b) => Canon.bookIdToNumber(a) - Canon.bookIdToNumber(b));

    if (this.data.rangeStart != null) {
      const rangeStart = this.data.rangeStart;
      // Is rangeStart for a book and chapter in the list we know about, and
      // with a verse not greater than the last verse of that chapter?
      if (books.includes(rangeStart.book)) {
        const chapter = this.data.booksAndChaptersToShow[rangeStart.book].chapters.find(
          c => c.number === rangeStart.chapterNum
        );
        if (chapter != null && rangeStart.verseNum <= chapter.lastVerse) {
          this.selection.book = this.data.rangeStart.book;
          this.selection.chapter = this.data.rangeStart.chapter;
          void this.loadVersesInChapter(rangeStart.book, rangeStart.chapterNum);
          this.showRangeEndSelection();
        }
      }
    }
    // When there is only one book available then start at the chapters view
    if (!this.hasMultipleBooks) {
      this.onClickBook(Object.keys(this.data.booksAndChaptersToShow)[0]);
    }
  }

  onCloseFocus(event: Event): void {
    // Blur close button when dialog first loads, since it looks visually unappealing.
    // Don't subsequently blur the close button if the user tabs over to it.
    const focuses = ++this.closeFocuses;
    setTimeout(() => {
      if (focuses <= 1) {
        (event.target as HTMLElement).blur();
      }
    }, 1);
  }

  onClickBook(book: string): void {
    this.selection.book = book;
    this.showChapterSelection();
  }

  async onClickChapter(chapter: number): Promise<void> {
    this.selection.chapter = chapter.toString();
    if (this.data.includeVerseSelection === false) {
      this.dialogRef.close(new VerseRef(this.selection.book!, this.selection.chapter!, ''));
    } else {
      await this.loadVersesInChapter(this.selection.book!, chapter);
      this.showVerseSelection();
    }
  }

  onClickVerse(verse: number): void {
    this.selection.verse = verse.toString();
    this.dialogRef.close(new VerseRef(this.selection.book!, this.selection.chapter!, this.selection.verse));
  }

  onClickBackoutButton(): void {
    if (this.showing === 'books' || this.showing === 'rangeEnd') {
      this.dialogRef.close('close');
    }
    if (this.showing === 'chapters') {
      this.showBookSelection();
    }
    if (this.showing === 'verses') {
      this.showChapterSelection();
    }
  }

  showBookSelection(): void {
    this.showing = 'books';
  }

  showChapterSelection(): void {
    this.showing = 'chapters';
  }

  showVerseSelection(): void {
    this.showing = 'verses';
  }

  showRangeEndSelection(): void {
    this.showing = 'rangeEnd';
  }

  /** Returns an array of all chapters for a given book that the dialog was told about.
   * (Not necessarily all possible chapters of a given book.) */
  chaptersOf(bookId: string | undefined): number[] {
    if (!bookId) {
      return [];
    }
    return this.data.booksAndChaptersToShow[bookId].chapters.map(chapter => chapter.number);
  }

  /** Returns the verses of a chapter that can be selected: the verses its text contains, or, when that text is not
   * available, every verse through the last verse of the chapter. */
  versesOf(bookId: string | undefined, chapter: string | undefined, startingWithVerse?: number): number[] | undefined {
    if (!bookId || !chapter) {
      return undefined;
    }

    const chapterInfo = this.data.booksAndChaptersToShow[bookId].chapters.find(chap => chap.number === +chapter);
    if (chapterInfo == null) {
      return undefined;
    }
    let verses: number[];
    if (this.versesInChapter?.bookId === bookId && this.versesInChapter.chapter === +chapter) {
      verses = this.versesInChapter.verses;
    } else {
      // The verses in the chapter are unknown, so offer all of them: [1, 2, ... , lastVerse]
      verses = Array.from([...Array(chapterInfo.lastVerse + 1).keys()]).slice(1);
    }
    if (startingWithVerse != null) {
      verses = verses.filter(verse => verse >= startingWithVerse);
    }
    return verses;
  }

  /** Records which verses exist in a chapter, so that verses the text skips are not offered. */
  private async loadVersesInChapter(bookId: string, chapter: number): Promise<void> {
    this.versesInChapter = undefined;
    if (this.data.projectId == null) {
      return;
    }
    const textDocId = new TextDocId(this.data.projectId, Canon.bookIdToNumber(bookId), chapter);
    // The chapter text may not be available, such as when offline and it has not been cached
    const verses = await this.projectService
      .getText(textDocId)
      .then(textDoc => textDoc.getVerseNumbers())
      .catch(() => []);
    if (verses.length > 0) {
      this.versesInChapter = { bookId, chapter, verses };
    }
  }

  getBookName(bookId: string | undefined): string {
    if (bookId == null) {
      return '';
    }
    const text = this.data.booksAndChaptersToShow[bookId];
    return this.i18n.localizeBook(text.bookNum);
  }

  getNumOrNaN(num: number | undefined): number {
    if (num == null) {
      return NaN;
    }
    return +num;
  }
}
