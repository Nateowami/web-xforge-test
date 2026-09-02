import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { VerseRef } from '@sillsdev/scripture';
import { QuillService } from 'ngx-quill';
import { User } from 'realtime-server/lib/esm/common/models/user';
import { createTestUser } from 'realtime-server/lib/esm/common/models/user-test-data';
import { SFProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import * as RichText from 'rich-text';
import { firstValueFrom } from 'rxjs';
import { anything, mock, when } from 'ts-mockito';
import { DialogService } from 'xforge-common/dialog.service';
import { UserDoc } from 'xforge-common/models/user-doc';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { provideTestRealtime } from 'xforge-common/test-realtime-providers';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../../../core/models/sf-project-profile-doc';
import { SF_TYPE_REGISTRY } from '../../../core/models/sf-type-registry';
import { TextDoc, TextDocId } from '../../../core/models/text-doc';
import { SFProjectService } from '../../../core/sf-project.service';
import { getCombinedVerseTextDoc, getInterruptedVerseTextDoc, getTextDoc } from '../../../shared/test-utils';
import { provideQuillRegistrations } from '../../../shared/text/quill-editor-registration/quill-providers';
import { EDITOR_READY_TIMEOUT } from '../../../shared/text/text.component';
import { CheckingTextComponent } from './checking-text.component';

const mockedSFProjectService = mock(SFProjectService);
const mockedUserService = mock(UserService);
const mockedDialogService = mock(DialogService);

describe('CheckingTextComponent', () => {
  configureTestingModule(() => ({
    imports: [CheckingTextComponent, getTestTranslocoModule()],
    providers: [
      provideQuillRegistrations(),
      provideTestRealtime(SF_TYPE_REGISTRY),
      provideTestOnlineStatus(),
      { provide: OnlineStatusService, useClass: TestOnlineStatusService },
      { provide: SFProjectService, useMock: mockedSFProjectService },
      { provide: UserService, useMock: mockedUserService },
      { provide: DialogService, useMock: mockedDialogService }
    ]
  }));

  beforeEach(async () => {
    // Pre-load Quill before each test to avoid async Quill import issues
    const quillService = TestBed.inject(QuillService);
    await firstValueFrom(quillService.getQuill());
  });

  it('should move the question icon when the question moves verses', fakeAsync(() => {
    const env = new TestEnvironment();
    env.wait();
    expect(env.segmentHasQuestion(1, 1)).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_1')).toBe(true);
    // verse 2 is blank
    expect(env.segmentHasQuestion(1, 3)).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_3')).toBe(false);
    expect(env.segmentHasQuestion(1, 4)).toBe(false);
    expect(env.isSegmentHighlighted('verse_1_4')).toBe(false);

    // change 2nd question from v3 to v4
    env.component.questionVerses = [new VerseRef(40, 1, 1), new VerseRef(40, 1, 4)];

    env.wait();
    expect(env.segmentHasQuestion(1, 1)).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_1')).toBe(true);
    expect(env.segmentHasQuestion(1, 3)).toBe(false);
    expect(env.isSegmentHighlighted('verse_1_3')).toBe(false);
    expect(env.segmentHasQuestion(1, 4)).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_4')).toBe(false);
  }));

  it('should highlight the new verse when the question moves verses and is now active', fakeAsync(() => {
    const env = new TestEnvironment();
    env.wait();
    expect(env.segmentHasQuestion(1, 1)).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_1')).toBe(true);
    // verse 2 is blank
    expect(env.segmentHasQuestion(1, 3)).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_3')).toBe(false);
    expect(env.segmentHasQuestion(1, 4)).toBe(false);
    expect(env.isSegmentHighlighted('verse_1_4')).toBe(false);

    // change 1st question to include verse 2 (empty)
    const verseRefWithBlank = VerseRef.tryParse('MAT 1:1-2');
    env.component.activeVerse = verseRefWithBlank.verseRef;
    env.component.questionVerses = [verseRefWithBlank.verseRef];
    env.wait();
    expect(env.isSegmentHighlighted('verse_1_1')).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_2')).toBe(true);

    // // change 2nd question from v3 to v4 and make it active
    const activeVerse = new VerseRef(40, 1, 4);
    env.component.activeVerse = activeVerse;
    env.component.questionVerses = [new VerseRef(40, 1, 1), activeVerse];

    env.wait();
    expect(env.segmentHasQuestion(1, 1)).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_1')).toBe(false);
    expect(env.segmentHasQuestion(1, 3)).toBe(false);
    expect(env.isSegmentHighlighted('verse_1_3')).toBe(false);
    expect(env.segmentHasQuestion(1, 4)).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_4')).toBe(true);
  }));

  it('should show related questions when the text changes ', fakeAsync(() => {
    const env = new TestEnvironment();
    env.wait();

    expect(env.segmentHasQuestion(1, 1)).toBe(true);
    expect(env.segmentHasQuestion(1, 3)).toBe(true);
    expect(env.segmentHasQuestion(2, 1)).toBe(false);

    env.component.id = new TextDocId('project01', 40, 2);
    env.wait();

    expect(env.segmentHasQuestion(1, 1)).toBe(false);
    expect(env.segmentHasQuestion(1, 3)).toBe(false);
    expect(env.segmentHasQuestion(2, 1)).toBe(true);
  }));

  it('highlights combined verse', fakeAsync(() => {
    const env = new TestEnvironment();
    env.component.id = new TextDocId('project01', 41, 1);
    env.component.questionVerses = [new VerseRef('MRK', '1', '2-3')];
    env.component.activeVerse = new VerseRef('MRK', '1', '2-3');
    env.wait();
    expect(env.segmentHasQuestion(1, 1)).toBe(false);
    expect(env.segmentHasQuestion(1, '2-3')).toBe(true);
    expect(env.isSegmentHighlighted('verse_1_2-3')).toBe(true);
    expect(env.isSegmentHighlighted('s_2')).toBe(false);
    expect(env.getSegmentElement('s_2')!.classList).not.toContain('question-segment');
  }));

  it('highlights all segments of active verse', fakeAsync(() => {
    const env = new TestEnvironment();
    env.component.id = new TextDocId('project01', 41, 1);
    env.component.questionVerses = [new VerseRef('MRK', '1', '1')];

    env.component.activeVerse = new VerseRef('MRK', '1', '6');
    env.wait();
    expect(env.isSegmentHighlighted('verse_1_6a')).toBe(true);
    // highlight both segments of verse 6
    expect(env.isSegmentHighlighted('verse_1_6b')).toBe(true);
  }));

  it('highlights all segments of an active verse that is interrupted by a page break or heading', fakeAsync(() => {
    const env = new TestEnvironment();
    env.component.id = new TextDocId('project01', 42, 1);

    // verse 1 continues after a page break
    env.component.activeVerse = new VerseRef('LUK', '1', '1');
    env.wait();
    expect(env.isSegmentHighlighted('verse_1_1')).toBe(true);
    expect(env.isSegmentHighlighted('pb_1')).toBe(true);
    // the blank segment that begins the paragraph of the next verse is not part of verse 1
    expect(env.isSegmentHighlighted('p_2')).toBe(false);

    // verse 2 continues after a semantic division
    env.component.activeVerse = new VerseRef('LUK', '1', '2');
    env.wait();
    expect(env.isSegmentHighlighted('verse_1_2')).toBe(true);
    expect(env.isSegmentHighlighted('p_3')).toBe(true);
    expect(env.isSegmentHighlighted('sd1_1')).toBe(false);

    // verse 3 continues after a section heading
    env.component.activeVerse = new VerseRef('LUK', '1', '3');
    env.wait();
    expect(env.isSegmentHighlighted('verse_1_3')).toBe(true);
    expect(env.isSegmentHighlighted('pi1_1')).toBe(true);
    expect(env.isSegmentHighlighted('s_1')).toBe(false);
  }));

  it('marks all segments of a question verse that is interrupted by a page break or heading', fakeAsync(() => {
    const env = new TestEnvironment();
    env.component.id = new TextDocId('project01', 42, 1);
    env.component.activeVerse = undefined;
    env.component.questionVerses = [new VerseRef('LUK', '1', '1'), new VerseRef('LUK', '1', '3')];
    env.wait();

    for (const segment of ['verse_1_1', 'pb_1', 'verse_1_3', 'pi1_1']) {
      expect(env.getSegmentElement(segment)!.classList).withContext(segment).toContain('question-segment');
    }
    for (const segment of ['p_2', 's_1', 'verse_1_2', 'p_3']) {
      expect(env.getSegmentElement(segment)!.classList).withContext(segment).not.toContain('question-segment');
    }
    // the question icon belongs on the segment where the verse starts
    expect(env.getSegmentElement('verse_1_1')!.getAttribute('data-question-count')).toEqual('1');
    expect(env.getSegmentElement('pb_1')!.getAttribute('data-question-count')).toBeNull();
  }));

  it('can set text direction explicitly', fakeAsync(() => {
    const env = new TestEnvironment();
    env.wait();
    expect(env.fixture.nativeElement.querySelector('quill-editor[class="read-only-editor ltr"]')).not.toBeNull();
    env.component.isRightToLeft = true;
    env.wait();
    expect(env.fixture.nativeElement.querySelector('quill-editor[class="read-only-editor rtl"]')).not.toBeNull();
  }));

  it('should have local presence disabled', fakeAsync(() => {
    const env = new TestEnvironment();
    env.wait();

    expect(env.component.textComponent.enablePresence).toBe(false);
  }));

  it('does not highlight verse if already set', fakeAsync(() => {
    const env = new TestEnvironment();
    env.component.id = new TextDocId('project01', 40, 1);
    const spyHighlight = spyOn(env.component.textComponent, 'highlight').and.callThrough();
    const activeVerse = new VerseRef(40, 1, 4);
    env.component.questionVerses = [activeVerse];
    env.component.activeVerse = activeVerse;
    env.wait();

    expect(env.isSegmentHighlighted('verse_1_4')).toBe(true);
    expect(spyHighlight).toHaveBeenCalledTimes(1);

    // SUT
    env.component.activeVerse = activeVerse;

    env.wait();
    expect(env.isSegmentHighlighted('verse_1_4')).toBe(true);
    expect(spyHighlight).toHaveBeenCalledTimes(1);
  }));
});

class TestEnvironment {
  readonly component: CheckingTextComponent;
  readonly fixture: ComponentFixture<CheckingTextComponent>;
  readonly testOnlineStatusService: TestOnlineStatusService = TestBed.inject(
    OnlineStatusService
  ) as TestOnlineStatusService;

  private readonly realtimeService: TestRealtimeService = TestBed.inject<TestRealtimeService>(TestRealtimeService);

  constructor() {
    this.addTextDoc(new TextDocId('project01', 40, 1, 'target'));
    this.addTextDoc(new TextDocId('project01', 40, 2, 'target'));
    this.addCombinedVerseTextDoc(new TextDocId('project01', 41, 1, 'target'));
    this.addInterruptedVerseTextDoc(new TextDocId('project01', 42, 1, 'target'));
    this.setupProject();
    this.realtimeService.addSnapshot<User>(UserDoc.COLLECTION, {
      id: 'user01',
      data: createTestUser({
        sites: {
          sf: {
            projects: ['project01']
          }
        }
      })
    });
    when(mockedSFProjectService.getProfile('project01')).thenCall(() =>
      this.realtimeService.subscribe(SFProjectProfileDoc.COLLECTION, 'project01')
    );
    when(mockedSFProjectService.getText(anything())).thenCall(id =>
      this.realtimeService.subscribe(TextDoc.COLLECTION, id.toString())
    );
    when(mockedUserService.getCurrentUser()).thenCall(() =>
      this.realtimeService.subscribe(UserDoc.COLLECTION, 'user01')
    );

    this.fixture = TestBed.createComponent(CheckingTextComponent);
    this.component = this.fixture.componentInstance;
    this.component.id = new TextDocId('project01', 40, 1, 'target');
    const activeVerse = new VerseRef(40, 1, 1);
    this.component.activeVerse = activeVerse;
    this.component.questionVerses = [activeVerse, new VerseRef(40, 1, 3), new VerseRef(40, 2, 1)];
  }

  get quillEditor(): HTMLElement {
    return document.getElementsByClassName('ql-container')[0] as HTMLElement;
  }

  set onlineStatus(hasConnection: boolean) {
    this.testOnlineStatusService.setIsOnline(hasConnection);
    tick();
    this.fixture.detectChanges();
  }

  getSegmentElement(segmentRef: string): HTMLElement | null {
    return this.quillEditor.querySelector(`usx-segment[data-segment="${segmentRef}"]`);
  }

  isSegmentHighlighted(segmentRef: string): boolean {
    const segment: HTMLElement | null = this.getSegmentElement(segmentRef)!;
    return segment != null && segment.classList.contains('highlight-segment');
  }

  segmentHasQuestion(chapter: number, verse: number | string): boolean {
    const segment: HTMLElement | null = this.quillEditor.querySelector(
      `usx-segment[data-segment="verse_${chapter}_${verse}"]`
    )!;
    return segment != null && segment.classList.contains('question-segment');
  }

  wait(): void {
    this.fixture.detectChanges();
    tick(EDITOR_READY_TIMEOUT);
    this.fixture.detectChanges();
  }

  private addTextDoc(id: TextDocId): void {
    this.realtimeService.addSnapshot(TextDoc.COLLECTION, {
      id: id.toString(),
      type: RichText.type.name,
      data: getTextDoc(id)
    });
  }

  private addInterruptedVerseTextDoc(id: TextDocId): void {
    this.realtimeService.addSnapshot(TextDoc.COLLECTION, {
      id: id.toString(),
      type: RichText.type.name,
      data: getInterruptedVerseTextDoc(id)
    });
  }

  private addCombinedVerseTextDoc(id: TextDocId): void {
    this.realtimeService.addSnapshot(TextDoc.COLLECTION, {
      id: id.toString(),
      type: RichText.type.name,
      data: getCombinedVerseTextDoc(id)
    });
  }

  private setupProject(): void {
    this.realtimeService.addSnapshot<SFProjectProfile>(SFProjectProfileDoc.COLLECTION, {
      id: 'project01',
      data: createTestProjectProfile({
        texts: [
          {
            bookNum: 40,
            chapters: [
              { number: 1, lastVerse: 3, isValid: true, permissions: {} },
              { number: 2, lastVerse: 3, isValid: true, permissions: {} }
            ],
            hasSource: true,
            permissions: {}
          },
          {
            bookNum: 41,
            chapters: [{ number: 1, lastVerse: 3, isValid: true, permissions: {} }],
            hasSource: true,
            permissions: {}
          },
          {
            bookNum: 42,
            chapters: [{ number: 1, lastVerse: 4, isValid: true, permissions: {} }],
            hasSource: true,
            permissions: {}
          }
        ]
      })
    });
  }
}
