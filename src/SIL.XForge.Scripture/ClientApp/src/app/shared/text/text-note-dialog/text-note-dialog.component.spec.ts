import { DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import {
  ChildViewContainerComponent,
  configureTestingModule,
  getTestTranslocoModule,
  matDialogCloseDelay
} from 'xforge-common/test-utils';
import { NoteDialogData, TextNoteDialogComponent, TextNoteType } from './text-note-dialog.component';

describe('TextNoteDialogComponent', () => {
  configureTestingModule(() => ({
    imports: [getTestTranslocoModule(false), TextNoteDialogComponent]
  }));
  let env: TestEnvironment;

  afterEach(fakeAsync(() => {
    env.closeDialog();
  }));

  it('Displays footnotes', fakeAsync(() => {
    const text = 'Footnote text';
    env = new TestEnvironment({ type: TextNoteType.Footnote, text, isRightToLeft: false });
    expect(env.title).toBe('text_note_dialog.footnote');
    expect(env.text).toBe(text);
  }));

  it('Displays extended footnotes', fakeAsync(() => {
    const text = 'Footnote text';
    env = new TestEnvironment({ type: TextNoteType.ExtendedFootnote, text, isRightToLeft: false });
    expect(env.title).toBe('text_note_dialog.footnote');
    expect(env.text).toBe(text);
  }));

  it('Displays end notes', fakeAsync(() => {
    const text = 'End note text';
    env = new TestEnvironment({ type: TextNoteType.EndNote, text, isRightToLeft: false });
    expect(env.title).toBe('text_note_dialog.end_note');
    expect(env.text).toBe(text);
  }));

  it('Displays cross-references', fakeAsync(() => {
    const text = 'Cross-reference text';
    env = new TestEnvironment({ type: TextNoteType.CrossReference, text, isRightToLeft: false });
    expect(env.title).toBe('text_note_dialog.cross_reference');
    expect(env.text).toBe(text);
  }));

  it('Displays extended cross-references', fakeAsync(() => {
    const text = 'Cross-reference text';
    env = new TestEnvironment({ type: TextNoteType.ExtendedCrossReference, text, isRightToLeft: false });
    expect(env.title).toBe('text_note_dialog.cross_reference');
    expect(env.text).toBe(text);
  }));

  it('Displays web addresses as links', fakeAsync(() => {
    const text = 'See https://example.org/notes?id=1, www.example.com and http://example.net.';
    env = new TestEnvironment({ type: TextNoteType.Footnote, text, isRightToLeft: false });
    expect(env.text).toBe(text);
    expect(env.links.map(link => link.getAttribute('href'))).toEqual([
      'https://example.org/notes?id=1',
      'https://www.example.com',
      'http://example.net'
    ]);
    expect(env.links.map(link => link.textContent)).toEqual([
      'https://example.org/notes?id=1',
      'www.example.com',
      'http://example.net'
    ]);
    expect(env.links.every(link => link.getAttribute('target') === '_blank')).toBe(true);
  }));

  it('Does not display text without web addresses as links', fakeAsync(() => {
    const text = 'Some manuscripts read example.org: or https:';
    env = new TestEnvironment({ type: TextNoteType.Footnote, text, isRightToLeft: false });
    expect(env.text).toBe(text);
    expect(env.links.length).toBe(0);
  }));
});

class TestEnvironment {
  fixture: ComponentFixture<ChildViewContainerComponent>;
  component: TextNoteDialogComponent;
  dialogRef: MatDialogRef<TextNoteDialogComponent>;

  constructor(configData: NoteDialogData) {
    this.fixture = TestBed.createComponent(ChildViewContainerComponent);
    this.dialogRef = TestBed.inject(MatDialog).open(TextNoteDialogComponent, { data: configData });
    this.component = this.dialogRef.componentInstance;
    this.fixture.detectChanges();
    tick();
  }

  get overlayContainerElement(): DebugElement {
    return this.fixture.debugElement.parent!.query(By.css('.cdk-overlay-container'));
  }

  get title(): string {
    return this.overlayContainerElement.query(By.css('h1 span'))!.nativeElement.textContent.trim();
  }

  get text(): string {
    return this.overlayContainerElement.query(By.css('mat-dialog-content'))!.nativeElement.textContent.trim();
  }

  get links(): HTMLAnchorElement[] {
    return this.overlayContainerElement
      .queryAll(By.css('mat-dialog-content a'))
      .map(debugElement => debugElement.nativeElement);
  }

  closeDialog(): void {
    this.overlayContainerElement.query(By.css('button[mat-dialog-close]')).nativeElement.click();
    this.fixture.detectChanges();
    tick(matDialogCloseDelay);
  }
}
