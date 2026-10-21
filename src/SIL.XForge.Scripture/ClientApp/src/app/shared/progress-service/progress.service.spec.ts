import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { TextData } from 'realtime-server/lib/esm/scriptureforge/models/text-data';
import { DeltaOperation } from 'rich-text';
import { anything, instance, mock, reset, verify, when } from 'ts-mockito';
import { MemoryOfflineStore } from 'xforge-common/memory-offline-store';
import { MemoryRealtimeRemoteStore } from 'xforge-common/memory-realtime-remote-store';
import { RealtimeOfflineData } from 'xforge-common/models/realtime-offline-data';
import { NoticeService } from 'xforge-common/notice.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { SF_TYPE_REGISTRY } from '../../core/models/sf-type-registry';
import { TextDoc } from '../../core/models/text-doc';
import { SFProjectService } from '../../core/sf-project.service';
import {
  BookProgress,
  BookProgressWithChapterProgress,
  countVerseSegments,
  estimatedActualBookProgress,
  ProgressService,
  ProjectProgress,
  ProjectProgressWithChapterProgress
} from './progress.service';

const mockedNoticeService = mock(NoticeService);
const mockedProjectService = mock(SFProjectService);
const mockedOnlineStatusService = mock(OnlineStatusService);

describe('ProgressService', () => {
  beforeEach(() => {
    reset(mockedNoticeService);
    reset(mockedProjectService);
    reset(mockedOnlineStatusService);
  });

  it('should get fresh progress data', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const expectedBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] },
      { bookId: 'MAT', verseSegments: 50, blankVerseSegments: 10, chapters: [] }
    ];
    when(mockedProjectService.getProjectProgress(projectId)).thenResolve(expectedBooks);

    let result: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 1000 }).then(r => (result = r));
    flushMicrotasks();

    expect(result).toBeInstanceOf(ProjectProgress);
    expect(result?.books).toEqual(expectedBooks);
    expect(result?.verseSegments).toBe(150);
    expect(result?.blankVerseSegments).toBe(30);
    expect(result?.translatedVerseSegments).toBe(120);
    expect(result?.ratio).toBeCloseTo(0.8);
    verify(mockedProjectService.getProjectProgress(projectId)).once();
  }));

  it('should return cached data when fresh', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const expectedBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];
    when(mockedProjectService.getProjectProgress(projectId)).thenResolve(expectedBooks);

    let result1: ProjectProgress | undefined;
    let result2: ProjectProgress | undefined;

    env.service.getProgress(projectId, { maxStalenessMs: 10000 }).then(r => (result1 = r));
    flushMicrotasks();
    env.service.getProgress(projectId, { maxStalenessMs: 10000 }).then(r => (result2 = r));
    flushMicrotasks();

    expect(result1?.books).toEqual(expectedBooks);
    expect(result2?.books).toEqual(expectedBooks);
    verify(mockedProjectService.getProjectProgress(projectId)).once();
  }));

  it('should fetch fresh data when cache is stale', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const firstBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];
    const secondBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 120, blankVerseSegments: 15, chapters: [] }
    ];

    when(mockedProjectService.getProjectProgress(projectId)).thenResolve(firstBooks).thenResolve(secondBooks);

    const nowSpy = spyOn(Date, 'now');
    nowSpy.and.returnValues(1000, 2000, 2000);

    let result1: ProjectProgress | undefined;
    let result2: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 1000 }).then(r => (result1 = r));
    flushMicrotasks();
    env.service.getProgress(projectId, { maxStalenessMs: 5 }).then(r => (result2 = r));
    flushMicrotasks();

    expect(result1?.books).toEqual(firstBooks);
    expect(result2?.books).toEqual(secondBooks);
    verify(mockedProjectService.getProjectProgress(projectId)).twice();
  }));

  it('always fetches fresh data when maxStalenessMs is 0, even with a warm cache', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const firstBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];
    const secondBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 120, blankVerseSegments: 15, chapters: [] }
    ];
    when(mockedProjectService.getProjectProgress(projectId)).thenResolve(firstBooks).thenResolve(secondBooks);

    let result1: ProjectProgress | undefined;
    let result2: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 0 }).then(r => (result1 = r));
    flushMicrotasks();
    env.service.getProgress(projectId, { maxStalenessMs: 0 }).then(r => (result2 = r));
    flushMicrotasks();

    expect(result1?.books).toEqual(firstBooks);
    expect(result2?.books).toEqual(secondBooks);
    verify(mockedProjectService.getProjectProgress(projectId)).twice();
  }));

  it('fetches fresh data for maxStalenessMs:0 even while a request is in flight', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const staleBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];
    const freshBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 120, blankVerseSegments: 15, chapters: [] }
    ];
    let resolveStale: ((value: BookProgressWithChapterProgress[]) => void) | undefined;
    let resolveFresh: ((value: BookProgressWithChapterProgress[]) => void) | undefined;
    const stalePromise: Promise<BookProgressWithChapterProgress[]> = new Promise(resolve => (resolveStale = resolve));
    const freshPromise: Promise<BookProgressWithChapterProgress[]> = new Promise(resolve => (resolveFresh = resolve));
    when(mockedProjectService.getProjectProgress(projectId)).thenReturn(stalePromise).thenReturn(freshPromise);
    // The first request starts and stays in flight (not yet resolved).
    let result1: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 1000 }).then(r => (result1 = r));

    let result2: ProjectProgress | undefined;
    // SUT
    env.service.getProgress(projectId, { maxStalenessMs: 0 }).then(r => (result2 = r));

    resolveStale!(staleBooks);
    resolveFresh!(freshBooks);
    flushMicrotasks();

    expect(result1?.books).toEqual(staleBooks);
    expect(result2?.books).toEqual(freshBooks);
    verify(mockedProjectService.getProjectProgress(projectId)).twice();
  }));

  it('refetches despite a warm cache when the project has synced since the data was fetched', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const preSyncBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];
    const postSyncBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 120, blankVerseSegments: 15, chapters: [] }
    ];
    when(mockedProjectService.getProjectProgress(projectId)).thenResolve(preSyncBooks).thenResolve(postSyncBooks);

    let result1: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 60_000 }).then(r => (result1 = r));
    flushMicrotasks();

    // A sync completes; the cached data is well within the staleness window but must not be served anymore.
    env.setLastSyncDateString(projectId, 'post-sync');
    let result2: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 60_000 }).then(r => (result2 = r));
    flushMicrotasks();

    expect(result1?.books).toEqual(preSyncBooks);
    expect(result2?.books).toEqual(postSyncBooks);
    verify(mockedProjectService.getProjectProgress(projectId)).twice();
  }));

  it('coalesces sibling reads issued after a sync while ignoring a request from before it', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const preSyncBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];
    const postSyncBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 120, blankVerseSegments: 15, chapters: [] }
    ];
    let resolvePreSync: ((value: BookProgressWithChapterProgress[]) => void) | undefined;
    let resolvePostSync: ((value: BookProgressWithChapterProgress[]) => void) | undefined;
    const preSyncPromise: Promise<BookProgressWithChapterProgress[]> = new Promise(
      resolve => (resolvePreSync = resolve)
    );
    const postSyncPromise: Promise<BookProgressWithChapterProgress[]> = new Promise(
      resolve => (resolvePostSync = resolve)
    );
    when(mockedProjectService.getProjectProgress(projectId)).thenReturn(preSyncPromise).thenReturn(postSyncPromise);

    // A request from before the sync is in flight...
    let result1: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 60_000 }).then(r => (result1 = r));
    flushMicrotasks();

    // ...then the sync completes and two sibling reads arrive.
    env.setLastSyncDateString(projectId, 'post-sync');
    let result2: ProjectProgress | undefined;
    let result3: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 60_000 }).then(r => (result2 = r));
    env.service.getProgress(projectId, { maxStalenessMs: 60_000 }).then(r => (result3 = r));
    flushMicrotasks();

    resolvePreSync!(preSyncBooks);
    resolvePostSync!(postSyncBooks);
    flushMicrotasks();

    // The pre-sync request was not reused, but the two sibling reads shared a single new request.
    expect(result1?.books).toEqual(preSyncBooks);
    expect(result2?.books).toEqual(postSyncBooks);
    expect(result3?.books).toEqual(postSyncBooks);
    verify(mockedProjectService.getProjectProgress(projectId)).twice();
  }));

  it('does not let a slower request from before a sync overwrite fresher post-sync data', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const preSyncBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];
    const postSyncBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 120, blankVerseSegments: 15, chapters: [] }
    ];
    let resolvePreSync: ((value: BookProgressWithChapterProgress[]) => void) | undefined;
    let resolvePostSync: ((value: BookProgressWithChapterProgress[]) => void) | undefined;
    const preSyncPromise: Promise<BookProgressWithChapterProgress[]> = new Promise(
      resolve => (resolvePreSync = resolve)
    );
    const postSyncPromise: Promise<BookProgressWithChapterProgress[]> = new Promise(
      resolve => (resolvePostSync = resolve)
    );
    when(mockedProjectService.getProjectProgress(projectId)).thenReturn(preSyncPromise).thenReturn(postSyncPromise);

    // Control the clock so the two requests demonstrably start at different times.
    let now = 1000;
    spyOn(Date, 'now').and.callFake(() => now);

    let result1: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 60_000 }).then(r => (result1 = r));
    flushMicrotasks();

    now = 2000;
    env.setLastSyncDateString(projectId, 'post-sync');
    let result2: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 60_000 }).then(r => (result2 = r));
    flushMicrotasks();

    // The post-sync request resolves first; the pre-sync one afterward.
    resolvePostSync!(postSyncBooks);
    flushMicrotasks();
    resolvePreSync!(preSyncBooks);
    flushMicrotasks();

    // A later read within the staleness window must see the post-sync data, not the pre-sync straggler's.
    now = 3000;
    let result3: ProjectProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 60_000 }).then(r => (result3 = r));
    flushMicrotasks();

    expect(result1?.books).toEqual(preSyncBooks);
    expect(result2?.books).toEqual(postSyncBooks);
    expect(result3?.books).toEqual(postSyncBooks);
    verify(mockedProjectService.getProjectProgress(projectId)).twice();
  }));

  it('should deduplicate concurrent requests for the same project', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const expectedBooks: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];

    let resolvePromise: ((value: BookProgressWithChapterProgress[]) => void) | undefined;
    const delayedPromise: Promise<BookProgressWithChapterProgress[]> = new Promise<BookProgressWithChapterProgress[]>(
      resolve => {
        resolvePromise = resolve;
      }
    );
    when(mockedProjectService.getProjectProgress(projectId)).thenReturn(delayedPromise);

    let result1: ProjectProgress | undefined;
    let result2: ProjectProgress | undefined;

    env.service.getProgress(projectId, { maxStalenessMs: 1000 }).then(r => (result1 = r));
    env.service.getProgress(projectId, { maxStalenessMs: 1000 }).then(r => (result2 = r));

    resolvePromise!(expectedBooks);
    flushMicrotasks();

    expect(result1?.books).toEqual(expectedBooks);
    expect(result2?.books).toEqual(expectedBooks);
    verify(mockedProjectService.getProjectProgress(projectId)).once();
  }));

  it('should clean up request cache on error and allow retry', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectId = 'project1';
    const error = new Error('Network error');
    when(mockedProjectService.getProjectProgress(projectId))
      .thenReject(error)
      .thenResolve([{ bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }]);

    let firstError: unknown;
    env.service.getProgress(projectId, { maxStalenessMs: 1000 }).catch(e => (firstError = e));
    flushMicrotasks();

    expect(firstError).toBe(error);

    let result2: ProjectProgressWithChapterProgress | undefined;
    env.service.getProgress(projectId, { maxStalenessMs: 1000 }).then(r => (result2 = r as any));
    flushMicrotasks();

    expect(result2?.books).toEqual([{ bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }]);
    verify(mockedProjectService.getProjectProgress(projectId)).twice();
  }));

  it('should cache independently per project', fakeAsync(() => {
    const env = new TestEnvironment();
    const project1Books: BookProgressWithChapterProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20, chapters: [] }
    ];
    const project2Books: BookProgressWithChapterProgress[] = [
      { bookId: 'MAT', verseSegments: 50, blankVerseSegments: 10, chapters: [] }
    ];

    when(mockedProjectService.getProjectProgress('project1')).thenResolve(project1Books);
    when(mockedProjectService.getProjectProgress('project2')).thenResolve(project2Books);

    let result1: ProjectProgress | undefined;
    let result2: ProjectProgress | undefined;
    env.service.getProgress('project1', { maxStalenessMs: 1000 }).then(r => (result1 = r));
    env.service.getProgress('project2', { maxStalenessMs: 1000 }).then(r => (result2 = r));
    flushMicrotasks();

    expect(result1?.books).toEqual(project1Books);
    expect(result2?.books).toEqual(project2Books);
    verify(mockedProjectService.getProjectProgress('project1')).once();
    verify(mockedProjectService.getProjectProgress('project2')).once();
  }));

  describe('offline', () => {
    it('calculates progress from texts stored on the device instead of asking the server', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setProjectTexts('project1', [
        { bookNum: 40, chapters: [1, 2] },
        { bookNum: 1, chapters: [1] }
      ]);
      env.addOfflineText('project1:MAT:1:target', [
        { insert: { verse: { number: '1' } } },
        { insert: 'text', attributes: { segment: 'verse_1_1' } },
        { insert: { blank: true }, attributes: { segment: 'verse_1_2' } }
      ]);
      env.addOfflineText('project1:MAT:2:target', [{ insert: { blank: true }, attributes: { segment: 'verse_2_1' } }]);
      env.addOfflineText('project1:GEN:1:target', [{ insert: 'text', attributes: { segment: 'verse_1_1' } }]);
      env.isOnline = false;

      let result: ProjectProgressWithChapterProgress | undefined;
      env.service.getProgressWithChapterProgress('project1', { maxStalenessMs: 30_000 }).then(r => (result = r));
      flushMicrotasks();

      verify(mockedProjectService.getProjectProgress(anything())).never();
      expect(result?.books).toEqual([
        {
          bookId: 'GEN',
          verseSegments: 1,
          blankVerseSegments: 0,
          chapters: [{ chapterNumber: 1, verseSegments: 1, blankVerseSegments: 0 }]
        },
        {
          bookId: 'MAT',
          verseSegments: 3,
          blankVerseSegments: 2,
          chapters: [
            { chapterNumber: 1, verseSegments: 2, blankVerseSegments: 1 },
            { chapterNumber: 2, verseSegments: 1, blankVerseSegments: 1 }
          ]
        }
      ]);
      expect(result?.translatedVerseSegments).toBe(2);
    }));

    it('leaves out chapters and books that are not stored on the device', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setProjectTexts('project1', [
        { bookNum: 40, chapters: [1, 2] },
        { bookNum: 41, chapters: [1] }
      ]);
      env.addOfflineText('project1:MAT:2:target', [{ insert: 'text', attributes: { segment: 'verse_2_1' } }]);
      env.isOnline = false;

      let result: ProjectProgressWithChapterProgress | undefined;
      env.service.getProgressWithChapterProgress('project1', { maxStalenessMs: 30_000 }).then(r => (result = r));
      flushMicrotasks();

      expect(result?.books).toEqual([
        {
          bookId: 'MAT',
          verseSegments: 1,
          blankVerseSegments: 0,
          chapters: [{ chapterNumber: 2, verseSegments: 1, blankVerseSegments: 0 }]
        }
      ]);
    }));

    it('does not serve progress calculated offline once back online', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setProjectTexts('project1', [{ bookNum: 40, chapters: [1] }]);
      env.addOfflineText('project1:MAT:1:target', [{ insert: 'text', attributes: { segment: 'verse_1_1' } }]);
      const serverBooks: BookProgressWithChapterProgress[] = [
        { bookId: 'MAT', verseSegments: 10, blankVerseSegments: 4, chapters: [] }
      ];
      when(mockedProjectService.getProjectProgress('project1')).thenResolve(serverBooks);

      env.isOnline = false;
      env.service.getProgress('project1', { maxStalenessMs: 30_000 });
      flushMicrotasks();
      env.isOnline = true;
      let result: ProjectProgress | undefined;
      env.service.getProgress('project1', { maxStalenessMs: 30_000 }).then(r => (result = r));
      flushMicrotasks();

      expect(result?.books).toEqual(serverBooks);
      verify(mockedProjectService.getProjectProgress('project1')).once();
    }));
  });
});

class TestEnvironment {
  readonly service: ProgressService;
  /** sync.dateLastSuccessfulSync per project; change a project's value to simulate a completed sync. */
  private readonly lastSyncDateStrings = new Map<string, string>();
  private readonly projectTexts = new Map<string, { bookNum: number; chapters: number[] }[]>();
  private readonly realtimeService = new TestRealtimeService(
    SF_TYPE_REGISTRY,
    new MemoryRealtimeRemoteStore(),
    new MemoryOfflineStore()
  );

  constructor() {
    when(mockedProjectService.getProfile(anything())).thenCall((projectId: string) =>
      Promise.resolve({
        id: projectId,
        data: createTestProjectProfile({
          sync: { dateLastSuccessfulSync: this.lastSyncDateStrings.get(projectId) ?? 'initial-sync' },
          texts: (this.projectTexts.get(projectId) ?? []).map(t => ({
            bookNum: t.bookNum,
            hasSource: false,
            permissions: {},
            chapters: t.chapters.map(number => ({ number, lastVerse: 1, isValid: true, permissions: {} }))
          }))
        })
      } as unknown as SFProjectProfileDoc)
    );
    this.isOnline = true;
    this.service = new ProgressService(
      instance(mockedNoticeService),
      instance(mockedProjectService),
      instance(mockedOnlineStatusService),
      this.realtimeService
    );
  }

  set isOnline(value: boolean) {
    when(mockedOnlineStatusService.isOnline).thenReturn(value);
  }

  setProjectTexts(projectId: string, texts: { bookNum: number; chapters: number[] }[]): void {
    this.projectTexts.set(projectId, texts);
  }

  /** Stores a chapter on the device, without it being available from the server. */
  addOfflineText(textDocId: string, ops: DeltaOperation[]): void {
    const offlineData: RealtimeOfflineData = {
      id: textDocId,
      v: 1,
      type: 'rich-text',
      data: { ops } as TextData,
      pendingOps: []
    };
    (this.realtimeService.offlineStore as MemoryOfflineStore).addData(TextDoc.COLLECTION, offlineData);
  }

  setLastSyncDateString(projectId: string, dateString: string): void {
    this.lastSyncDateStrings.set(projectId, dateString);
  }
}

describe('ProjectProgress', () => {
  it('should calculate totals correctly with multiple books', () => {
    const books: BookProgress[] = [
      { bookId: 'GEN', verseSegments: 100, blankVerseSegments: 20 },
      { bookId: 'EXO', verseSegments: 80, blankVerseSegments: 15 },
      { bookId: 'MAT', verseSegments: 50, blankVerseSegments: 5 }
    ];

    const progress = new ProjectProgress(books);

    expect(progress.verseSegments).toBe(230);
    expect(progress.blankVerseSegments).toBe(40);
    expect(progress.translatedVerseSegments).toBe(190);
    expect(progress.ratio).toBeCloseTo(0.8261);
  });

  it('should handle empty books array', () => {
    const progress = new ProjectProgress([]);

    expect(progress.verseSegments).toBe(0);
    expect(progress.blankVerseSegments).toBe(0);
    expect(progress.translatedVerseSegments).toBe(0);
    expect(progress.ratio).toBe(0);
  });

  it('should handle all blank verses', () => {
    const books: BookProgress[] = [{ bookId: 'GEN', verseSegments: 100, blankVerseSegments: 100 }];

    const progress = new ProjectProgress(books);

    expect(progress.verseSegments).toBe(100);
    expect(progress.blankVerseSegments).toBe(100);
    expect(progress.translatedVerseSegments).toBe(0);
    expect(progress.ratio).toBe(0);
  });

  it('should handle no blank verses', () => {
    const books: BookProgress[] = [{ bookId: 'GEN', verseSegments: 100, blankVerseSegments: 0 }];

    const progress = new ProjectProgress(books);

    expect(progress.verseSegments).toBe(100);
    expect(progress.blankVerseSegments).toBe(0);
    expect(progress.translatedVerseSegments).toBe(100);
    expect(progress.ratio).toBe(1);
  });
});

describe('estimatedActualBookProgress', () => {
  it('should return normal ratio for books with sufficient segments', () => {
    const bookProgress: BookProgress = {
      bookId: 'GEN',
      verseSegments: 1500, // Close to expected 1533
      blankVerseSegments: 300
    };

    const result = estimatedActualBookProgress(bookProgress);

    expect(result).toBeCloseTo(0.8); // 1200 / 1500
  });

  it('should return estimated ratio for books with very few segments compared to expected verses', () => {
    const bookProgress: BookProgress = {
      bookId: 'GEN', // Expected verses: 1533
      verseSegments: 50, // Much less than 10% of 1533 (153.3)
      blankVerseSegments: 10
    };

    const result = estimatedActualBookProgress(bookProgress);

    // Should use 40 / 1533 instead of 40 / 50
    expect(result).toBeCloseTo(40 / 1533);
  });

  it('should handle books at the threshold (exactly 10% of expected verses)', () => {
    const bookProgress: BookProgress = {
      bookId: 'GEN', // Expected verses: 1533
      // 10% of 1533 is 153.3, and the implementation uses a strict "<" comparison.
      // Use a value just above the threshold to ensure we are in the "normal" ratio branch.
      verseSegments: 154,
      blankVerseSegments: 50
    };

    const result = estimatedActualBookProgress(bookProgress);

    // Should use normal ratio since it's at 10%
    expect(result).toBeCloseTo(104 / 154);
  });

  it('should handle books with no expected verse count', () => {
    const bookProgress: BookProgress = {
      bookId: 'UNKNOWN',
      verseSegments: 10,
      blankVerseSegments: 2
    };

    const result = estimatedActualBookProgress(bookProgress);

    expect(result).toBeCloseTo(0.8); // 8 / 10
  });

  it('should handle books with zero segments', () => {
    const bookProgress: BookProgress = {
      bookId: 'GEN',
      verseSegments: 0,
      blankVerseSegments: 0
    };

    const result = estimatedActualBookProgress(bookProgress);

    expect(result).toBe(0);
  });

  it('should handle books with all blank segments', () => {
    const bookProgress: BookProgress = {
      bookId: 'GEN',
      verseSegments: 100,
      blankVerseSegments: 100
    };

    const result = estimatedActualBookProgress(bookProgress);

    expect(result).toBe(0);
  });

  it('should handle various book IDs correctly', () => {
    // Ensure the "estimated" branch is used for each book by keeping verseSegments < 10% of expected verses.
    const testCases = [
      { bookId: 'MAT', expectedVerses: 1071, verseSegments: 5, blankVerseSegments: 1 },
      { bookId: 'RUT', expectedVerses: 85, verseSegments: 5, blankVerseSegments: 1 },
      { bookId: 'PSA', expectedVerses: 2527, verseSegments: 5, blankVerseSegments: 1 },
      // For JUD (25 verses), 10% is 2.5, so 5 segments would *not* trigger the estimated branch.
      { bookId: 'JUD', expectedVerses: 25, verseSegments: 2, blankVerseSegments: 1 }
    ];

    testCases.forEach(testCase => {
      const bookProgress: BookProgress = {
        bookId: testCase.bookId,
        verseSegments: testCase.verseSegments,
        blankVerseSegments: testCase.blankVerseSegments
      };

      const result = estimatedActualBookProgress(bookProgress);

      const translatedSegments: number = testCase.verseSegments - testCase.blankVerseSegments;
      expect(result).toBeCloseTo(translatedSegments / testCase.expectedVerses);
    });
  });
});

describe('countVerseSegments', () => {
  it('counts verse segment ops the same way the back end does', () => {
    const ops: DeltaOperation[] = [
      { insert: { blank: true }, attributes: { segment: 's_1' } },
      { insert: { verse: { number: '1' } } },
      { insert: 'In the ', attributes: { segment: 'verse_1_1' } },
      // A verse split into two ops by character formatting counts twice, as on the back end
      { insert: 'beginning', attributes: { segment: 'verse_1_1', char: { style: 'wj' } } },
      { insert: { blank: true }, attributes: { segment: 'verse_1_2' } },
      { insert: { blank: true }, attributes: { segment: 'verse_1_2/p_1' } },
      { insert: '\n', attributes: { para: { style: 'p' } } }
    ];

    expect(countVerseSegments(ops)).toEqual({ verseSegments: 4, blankVerseSegments: 2 });
  });

  it('handles a chapter with no ops', () => {
    expect(countVerseSegments(undefined)).toEqual({ verseSegments: 0, blankVerseSegments: 0 });
    expect(countVerseSegments([])).toEqual({ verseSegments: 0, blankVerseSegments: 0 });
  });
});
