import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { TextInfoPermission } from 'realtime-server/lib/esm/scriptureforge/models/text-info-permission';
import { DeltaOperation } from 'rich-text';
import { of, Subscription } from 'rxjs';
import { anything, capture, mock, verify, when } from 'ts-mockito';
import { ActivatedProjectService } from 'xforge-common/activated-project.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { SFProjectProfileDoc } from '../../../core/models/sf-project-profile-doc';
import { BuildDto } from '../../../machine-api/build-dto';
import { DraftHandlingService } from '../draft-handling.service';
import { DraftPreviewBooksComponent } from './draft-preview-books.component';

const mockedActivatedProjectService = mock(ActivatedProjectService);
const mockedRouter = mock(Router);
const mockedDraftHandlingService = mock(DraftHandlingService);

describe('DraftPreviewBooks', () => {
  let env: TestEnvironment;

  configureTestingModule(() => ({
    imports: [getTestTranslocoModule()],
    providers: [
      { provide: ActivatedProjectService, useMock: mockedActivatedProjectService },
      { provide: Router, useMock: mockedRouter },
      { provide: DraftHandlingService, useMock: mockedDraftHandlingService }
    ]
  }));

  afterEach(() => {
    env?.progressSubscription?.unsubscribe();
  });

  it('should show books for a build', fakeAsync(() => {
    env = new TestEnvironment({
      build: {
        additionalInfo: { translationScriptureRanges: [{ projectId: 'project01', scriptureRange: 'LEV' }] }
      } as BuildDto
    });
    expect(env.draftBookCount()).toEqual(1);
  }));

  it('should show books with drafts for a project if no build', fakeAsync(() => {
    env = new TestEnvironment({ draftedScriptureRange: 'GEN;EXO' });
    expect(env.draftBookCount()).toEqual(2);
  }));

  it('should show no books for a project with no drafts if no build', fakeAsync(() => {
    env = new TestEnvironment();
    expect(env.draftBookCount()).toEqual(0);
  }));

  it('can navigate to a specific book', fakeAsync(() => {
    env = new TestEnvironment({ draftedScriptureRange: 'GEN' });
    env.getBookButtonAtIndex(0).click();
    tick();
    env.fixture.detectChanges();
    verify(mockedRouter.navigate(anything(), anything())).once();
    const [url, extras] = capture(mockedRouter.navigate).first();
    expect(url).toEqual(['/projects', 'project01', 'translate', 'GEN', '1']);
    expect(extras).toEqual({
      queryParams: { 'draft-active': true, 'draft-timestamp': undefined }
    });
  }));

  it('can navigate to an empty target book', fakeAsync(() => {
    const bookNotInProject = 'NUM';
    env = new TestEnvironment({ draftedScriptureRange: bookNotInProject });
    env.getBookButtonAtIndex(0).click();
    tick();
    env.fixture.detectChanges();
    verify(mockedRouter.navigate(anything(), anything())).once();
    const [url, extras] = capture(mockedRouter.navigate).first();
    expect(url).toEqual(['/projects', 'project01', 'translate', bookNotInProject, '1']);
    expect(extras).toEqual({
      queryParams: { 'draft-active': true, 'draft-timestamp': undefined }
    });
  }));

  it('shows the chapter range and navigates to the first drafted chapter for a partial book', fakeAsync(() => {
    // GEN (book 1) has chapters 1-3 in the project, but only 2-3 were drafted, so this is a partial draft.
    env = new TestEnvironment({
      build: {
        additionalInfo: { translationScriptureRanges: [{ projectId: 'project01', scriptureRange: 'GEN2-3' }] }
      } as BuildDto
    });

    expect(env.getBookButtonAtIndex(0).textContent!.trim()).toBe('Genesis 2-3');

    env.getBookButtonAtIndex(0).click();
    tick();
    env.fixture.detectChanges();

    const [url] = capture(mockedRouter.navigate).first();
    expect(url).toEqual(['/projects', 'project01', 'translate', 'GEN', '2']);
  }));

  it('navigates to the first chapter with drafted verses for a whole-book draft', fakeAsync(() => {
    // The source only had text in chapter 3, but the whole book was drafted, so chapters 1 and 2 have only the book
    // heading and the AI-generated remark, with blank verses.
    env = new TestEnvironment({ draftedScriptureRange: 'GEN' });
    when(mockedDraftHandlingService.getBookDraft(anything(), anything())).thenResolve(
      new Map([
        ['1', [...TestEnvironment.bookHeadingOps, ...TestEnvironment.chapterOps(1, '')]],
        ['2', TestEnvironment.chapterOps(2, '')],
        ['3', TestEnvironment.chapterOps(3, 'In the beginning')]
      ])
    );

    env.getBookButtonAtIndex(0).click();
    tick();
    env.fixture.detectChanges();

    const [url] = capture(mockedRouter.navigate).first();
    expect(url).toEqual(['/projects', 'project01', 'translate', 'GEN', '3']);
    const [textDocId, options] = capture(mockedDraftHandlingService.getBookDraft).last();
    expect(textDocId.bookNum).toBe(1);
    expect(options.timestamp).toBeUndefined();
  }));

  it('looks for drafted verses in the draft of the build being previewed', fakeAsync(() => {
    const dateGenerated = '2026-10-14T06:37:16.000Z';
    env = new TestEnvironment({
      build: {
        additionalInfo: {
          dateGenerated,
          translationScriptureRanges: [{ projectId: 'project01', scriptureRange: 'GEN' }]
        }
      } as BuildDto
    });
    when(mockedDraftHandlingService.getBookDraft(anything(), anything())).thenResolve(
      new Map([
        ['1', TestEnvironment.chapterOps(1, '')],
        ['2', TestEnvironment.chapterOps(2, 'In the beginning')]
      ])
    );

    env.getBookButtonAtIndex(0).click();
    tick();
    env.fixture.detectChanges();

    const [url, extras] = capture(mockedRouter.navigate).first();
    expect(url).toEqual(['/projects', 'project01', 'translate', 'GEN', '2']);
    expect(extras).toEqual({ queryParams: { 'draft-active': true, 'draft-timestamp': dateGenerated } });
    const [, options] = capture(mockedDraftHandlingService.getBookDraft).last();
    expect(options.timestamp).toEqual(new Date(dateGenerated));
  }));

  it('does not fetch the draft when the drafted chapters are known', fakeAsync(() => {
    env = new TestEnvironment({ draftedScriptureRange: 'GEN2-3' });

    env.getBookButtonAtIndex(0).click();
    tick();
    env.fixture.detectChanges();

    const [url] = capture(mockedRouter.navigate).first();
    expect(url).toEqual(['/projects', 'project01', 'translate', 'GEN', '2']);
    verify(mockedDraftHandlingService.getBookDraft(anything(), anything())).never();
  }));

  it('disables the book buttons while looking for the first drafted chapter', fakeAsync(() => {
    env = new TestEnvironment({ draftedScriptureRange: 'GEN;EXO' });
    const resolveBookDraft = env.deferBookDraft();

    env.getBookButtonAtIndex(0).click();
    env.fixture.detectChanges();
    expect(env.getBookButtonAtIndex(0).disabled).toBe(true);
    expect(env.getBookButtonAtIndex(1).disabled).toBe(true);
    env.getBookButtonAtIndex(0).click();
    env.getBookButtonAtIndex(1).click();

    resolveBookDraft(new Map([['3', TestEnvironment.chapterOps(3, 'In the beginning')]]));
    tick();
    env.fixture.detectChanges();

    verify(mockedDraftHandlingService.getBookDraft(anything(), anything())).once();
    verify(mockedRouter.navigate(anything(), anything())).once();
    const [url] = capture(mockedRouter.navigate).first();
    expect(url).toEqual(['/projects', 'project01', 'translate', 'GEN', '3']);
    expect(env.getBookButtonAtIndex(0).disabled).toBe(false);
  }));

  it('does not navigate if the user went elsewhere while the draft was downloading', fakeAsync(() => {
    env = new TestEnvironment({ draftedScriptureRange: 'GEN' });
    when(mockedRouter.url).thenReturn('/projects/project01/translate/EXO/1');
    const resolveBookDraft = env.deferBookDraft();

    env.getBookButtonAtIndex(0).click();
    when(mockedRouter.url).thenReturn('/projects/project01/translate/EXO/2');
    resolveBookDraft(new Map([['3', TestEnvironment.chapterOps(3, 'In the beginning')]]));
    tick();
    env.fixture.detectChanges();

    verify(mockedRouter.navigate(anything(), anything())).never();
    expect(env.getBookButtonAtIndex(0).disabled).toBe(false);
  }));

  it('does not navigate if the book list was closed while the draft was downloading', fakeAsync(() => {
    env = new TestEnvironment({ draftedScriptureRange: 'GEN' });
    const resolveBookDraft = env.deferBookDraft();

    env.getBookButtonAtIndex(0).click();
    env.fixture.destroy();
    resolveBookDraft(new Map([['3', TestEnvironment.chapterOps(3, 'In the beginning')]]));
    tick();

    verify(mockedRouter.navigate(anything(), anything())).never();
  }));

  it('does not show a chapter range when the whole book was drafted', fakeAsync(() => {
    // Genesis has 50 chapters; all 50 were drafted, so it is a whole-book draft and no range is shown.
    env = new TestEnvironment({
      build: {
        additionalInfo: { translationScriptureRanges: [{ projectId: 'project01', scriptureRange: 'GEN1-50' }] }
      } as BuildDto
    });

    expect(env.getBookButtonAtIndex(0).textContent!.trim()).toBe('Genesis');
  }));
});

class TestEnvironment {
  component: DraftPreviewBooksComponent;
  fixture: ComponentFixture<DraftPreviewBooksComponent>;
  progressSubscription?: Subscription;
  loader: HarnessLoader;
  readonly paratextId = 'pt01';
  mockProjectDoc: SFProjectProfileDoc = {
    data: createTestProjectProfile({
      paratextId: this.paratextId,
      texts: [
        {
          bookNum: 1,
          hasSource: true,
          chapters: [{ number: 1 }, { number: 2 }, { number: 3 }],
          permissions: { user01: TextInfoPermission.Write }
        },
        {
          bookNum: 2,
          hasSource: true,
          chapters: [{ number: 1 }, { number: 2 }],
          permissions: { user01: TextInfoPermission.Write }
        },
        {
          bookNum: 3,
          hasSource: true,
          chapters: [{ number: 1 }, { number: 2 }],
          permissions: { user01: TextInfoPermission.Read }
        }
      ],
      userRoles: { user01: SFProjectRole.ParatextAdministrator, user02: SFProjectRole.ParatextTranslator },
      translateConfig: {
        source: { projectRef: 'test' },
        draftConfig: {}
      }
    })
  } as SFProjectProfileDoc;

  /** The ops before the first chapter marker, which are in the draft of chapter 1. */
  static readonly bookHeadingOps: DeltaOperation[] = [
    { insert: '- Source Project', attributes: { segment: 'id_1' } },
    { insert: '\n', attributes: { book: { code: 'GEN', style: 'id' } } }
  ];

  /** The draft of a chapter with two verses, each with the given text, or blank if the text is empty. */
  static chapterOps(chapter: number, verseText: string): DeltaOperation[] {
    const verseOps = (verse: number): DeltaOperation[] => [
      { insert: { verse: { number: `${verse}`, style: 'v' } } },
      {
        insert: verseText === '' ? { blank: true } : verseText,
        attributes: { segment: `verse_${chapter}_${verse}` }
      }
    ];
    return [
      { insert: { chapter: { number: `${chapter}`, style: 'c' } } },
      { insert: `This draft of GEN ${chapter} was generated by AI.`, attributes: { segment: 'rem_1' } },
      { insert: '\n', attributes: { para: { style: 'rem' } } },
      { insert: { blank: true }, attributes: { segment: 'p_1' } },
      ...verseOps(1),
      ...verseOps(2),
      { insert: '\n', attributes: { para: { style: 'p' } } }
    ];
  }

  constructor({ build, draftedScriptureRange }: { build?: BuildDto; draftedScriptureRange?: string } = {}) {
    when(mockedDraftHandlingService.getBookDraft(anything(), anything())).thenResolve(new Map());
    if (draftedScriptureRange != null) {
      this.mockProjectDoc.data!.translateConfig.draftConfig.draftedScriptureRange = draftedScriptureRange;
    }
    when(mockedActivatedProjectService.changes$).thenReturn(of(this.mockProjectDoc));
    when(mockedActivatedProjectService.projectDoc).thenReturn(this.mockProjectDoc);
    when(mockedActivatedProjectService.projectId).thenReturn('project01');
    this.fixture = TestBed.createComponent(DraftPreviewBooksComponent);
    this.component = this.fixture.componentInstance;
    this.component.build = build;
    this.loader = TestbedHarnessEnvironment.loader(this.fixture);
    tick();
    this.fixture.detectChanges();
  }

  /** Makes the book draft download wait until the returned function is called with the draft. */
  deferBookDraft(): (chapterDrafts: Map<string, DeltaOperation[]>) => void {
    let resolveBookDraft: (chapterDrafts: Map<string, DeltaOperation[]>) => void = () => {};
    when(mockedDraftHandlingService.getBookDraft(anything(), anything())).thenReturn(
      new Promise(resolve => (resolveBookDraft = resolve))
    );
    return chapterDrafts => resolveBookDraft(chapterDrafts);
  }

  draftBookCount(): number {
    return this.fixture.nativeElement.querySelectorAll('.draft-book-button').length;
  }

  getBookButtonAtIndex(index: number): HTMLButtonElement {
    return this.fixture.nativeElement.querySelectorAll('.draft-book-button')[index];
  }
}
