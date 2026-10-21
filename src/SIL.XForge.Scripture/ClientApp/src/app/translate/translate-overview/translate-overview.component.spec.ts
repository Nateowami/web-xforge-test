import { ErrorHandler } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { User } from 'realtime-server/lib/esm/common/models/user';
import { createTestUser } from 'realtime-server/lib/esm/common/models/user-test-data';
import { SFProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { of } from 'rxjs';
import { anything, mock, reset, verify, when } from 'ts-mockito';
import { AuthService } from 'xforge-common/auth.service';
import { L10nPercentPipe } from 'xforge-common/l10n-percent.pipe';
import { UserDoc } from 'xforge-common/models/user-doc';
import { NoticeService } from 'xforge-common/notice.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { provideTestRealtime } from 'xforge-common/test-realtime-providers';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { SF_TYPE_REGISTRY } from '../../core/models/sf-type-registry';
import {
  BookProgress,
  ProgressService,
  ProjectProgress,
  ProjectProgressWithChapterProgress
} from '../../shared/progress-service/progress.service';
import { FontUnsupportedMessageComponent } from '../font-unsupported-message/font-unsupported-message.component';
import { TranslateOverviewComponent } from './translate-overview.component';

const mockedActivatedRoute = mock(ActivatedRoute);
const mockedAuthService = mock(AuthService);
const mockedNoticeService = mock(NoticeService);
const mockedUserService = mock(UserService);
const mockedProgressService = mock(ProgressService);
const mockedErrorHandler = mock(ErrorHandler);

describe('TranslateOverviewComponent', () => {
  configureTestingModule(() => ({
    imports: [TranslateOverviewComponent, getTestTranslocoModule(), FontUnsupportedMessageComponent, L10nPercentPipe],
    providers: [
      provideTestOnlineStatus(),
      provideTestRealtime(SF_TYPE_REGISTRY),
      { provide: ActivatedRoute, useMock: mockedActivatedRoute },
      { provide: AuthService, useMock: mockedAuthService },
      { provide: NoticeService, useMock: mockedNoticeService },
      { provide: UserService, useMock: mockedUserService },
      { provide: OnlineStatusService, useClass: TestOnlineStatusService },
      { provide: ProgressService, useMock: mockedProgressService },
      { provide: ErrorHandler, useMock: mockedErrorHandler }
    ]
  }));

  it('should show progress from stored chapters while offline and refresh it when back online', fakeAsync(() => {
    const env = new TestEnvironment();
    env.setLocalProgress({ bookId: 'MAT', verseSegments: 4, blankVerseSegments: 1 }, true);
    env.isOnline = false;
    env.wait();

    expect(env.missingChaptersNotice).toBeNull();
    env.expectContainsTextProgress(0, 'Matthew', '3 of 4 segments');
    verify(mockedProgressService.getProgress(anything(), anything())).never();

    env.isOnline = true;
    env.expectContainsTextProgress(0, 'Matthew', '10 of 20 segments');
    verify(mockedProgressService.getProgress('project01', anything())).once();

    discardPeriodicTasks();
  }));

  it('should say when progress shown offline is missing chapters', fakeAsync(() => {
    const env = new TestEnvironment();
    env.setLocalProgress({ bookId: 'MAT', verseSegments: 4, blankVerseSegments: 1 }, false);
    env.isOnline = false;
    env.wait();

    expect(env.missingChaptersNotice).toBeTruthy();
    env.expectContainsTextProgress(0, 'Matthew', '3 of 4 segments');

    env.isOnline = true;
    expect(env.missingChaptersNotice).toBeNull();

    discardPeriodicTasks();
  }));

  it('should not let a slow offline calculation overwrite progress from the server', fakeAsync(() => {
    const env = new TestEnvironment();
    let resolveLocalProgress!: (result: { progress: ProjectProgressWithChapterProgress; isComplete: boolean }) => void;
    when(mockedProgressService.getLocalProgress('project01')).thenReturn(
      new Promise(resolve => (resolveLocalProgress = resolve))
    );
    env.isOnline = false;
    env.wait();

    env.isOnline = true;
    resolveLocalProgress({
      progress: new ProjectProgressWithChapterProgress([
        { bookId: 'MAT', verseSegments: 4, blankVerseSegments: 1, chapters: [] }
      ]),
      isComplete: false
    });
    env.wait();

    expect(env.missingChaptersNotice).toBeNull();
    env.expectContainsTextProgress(0, 'Matthew', '10 of 20 segments');

    discardPeriodicTasks();
  }));

  it('should keep updating progress after a request fails', fakeAsync(() => {
    const env = new TestEnvironment();
    when(mockedProgressService.getProgress(anything(), anything())).thenReject(new Error('server error'));
    env.setLocalProgress({ bookId: 'MAT', verseSegments: 4, blankVerseSegments: 1 }, true);
    env.wait();
    verify(mockedErrorHandler.handleError(anything())).once();

    when(mockedProgressService.getProgress(anything(), anything())).thenResolve(
      new ProjectProgress([{ bookId: 'MAT', verseSegments: 20, blankVerseSegments: 5 }])
    );
    env.isOnline = false;
    env.isOnline = true;
    env.expectContainsTextProgress(0, 'Matthew', '15 of 20 segments');

    discardPeriodicTasks();
  }));

  it('should stop recalculating progress after the page is left', fakeAsync(() => {
    const env = new TestEnvironment();
    env.setLocalProgress({ bookId: 'MAT', verseSegments: 4, blankVerseSegments: 1 }, true);
    env.wait();
    verify(mockedProgressService.getProgress(anything(), anything())).once();

    env.fixture.destroy();
    env.testOnlineStatusService.setIsOnline(false);
    tick();
    env.testOnlineStatusService.setIsOnline(true);
    tick();

    verify(mockedProgressService.getLocalProgress(anything())).never();
    verify(mockedProgressService.getProgress(anything(), anything())).once();

    discardPeriodicTasks();
  }));

  it('progress card should list all books in project', fakeAsync(() => {
    const env = new TestEnvironment();
    env.wait();

    expect(env.progressTitle.textContent).toContain('Progress');
    expect(env.component.projectProgress?.books.length).toEqual(4);
    env.expectContainsTextProgress(0, 'Matthew', '10 of 20 segments');
    env.expectContainsTextProgress(1, 'Mark', '10 of 20 segments');
    env.expectContainsTextProgress(2, 'Luke', '10 of 20 segments');
    env.expectContainsTextProgress(3, 'John', '10 of 20 segments');

    discardPeriodicTasks();
  }));
});

class TestEnvironment {
  readonly component: TranslateOverviewComponent;
  readonly fixture: ComponentFixture<TranslateOverviewComponent>;

  readonly testOnlineStatusService: TestOnlineStatusService = TestBed.inject(
    OnlineStatusService
  ) as TestOnlineStatusService;

  private readonly realtimeService: TestRealtimeService = TestBed.inject<TestRealtimeService>(TestRealtimeService);

  constructor() {
    reset(mockedProgressService);
    reset(mockedErrorHandler);
    const params = { ['projectId']: 'project01' } as Params;
    when(mockedActivatedRoute.params).thenReturn(of(params));
    when(mockedActivatedRoute.snapshot).thenReturn({} as any); // just needs to not be null/undefined
    when(mockedProgressService.getProgress(anything(), anything())).thenResolve(
      new ProjectProgress([
        { bookId: 'MAT', verseSegments: 20, blankVerseSegments: 10 },
        { bookId: 'MRK', verseSegments: 20, blankVerseSegments: 10 },
        { bookId: 'LUK', verseSegments: 20, blankVerseSegments: 10 },
        { bookId: 'JHN', verseSegments: 20, blankVerseSegments: 10 }
      ])
    );

    this.setCurrentUser();

    this.fixture = TestBed.createComponent(TranslateOverviewComponent);
    this.component = this.fixture.componentInstance;
    this.setupProjectData();
    this.setupUserData();
  }

  get missingChaptersNotice(): HTMLElement | null {
    return this.fixture.nativeElement.querySelector('app-notice[icon="cloud_off"]');
  }

  get progressTextList(): HTMLElement {
    return this.fixture.nativeElement.querySelector('mat-list');
  }

  get progressTitle(): HTMLElement {
    return this.fixture.nativeElement.querySelector('#translate-overview-title');
  }

  set isOnline(value: boolean) {
    this.testOnlineStatusService.setIsOnline(value);
    this.wait();
  }

  setLocalProgress(book: BookProgress, isComplete: boolean): void {
    when(mockedProgressService.getLocalProgress('project01')).thenResolve({
      progress: new ProjectProgressWithChapterProgress([{ ...book, chapters: [] }]),
      isComplete
    });
  }

  setCurrentUser(userId: string = 'user01'): void {
    when(mockedUserService.currentUserId).thenReturn(userId);
    when(mockedUserService.getCurrentUser()).thenCall(() => this.realtimeService.subscribe(UserDoc.COLLECTION, userId));
  }

  wait(): void {
    this.fixture.detectChanges();
    tick();
    this.fixture.detectChanges();
  }

  // Some project doc changes are throttled by 1000 ms, so we have to wait for them
  waitForProjectDocChanges(): void {
    tick(1000);
    this.wait();
  }

  expectContainsTextProgress(index: number, primary: string, secondary: string): void {
    const items: NodeListOf<Element> = this.progressTextList.querySelectorAll('mat-list-item');
    const item: Element = items.item(index);
    const primaryElem: Element = item.querySelectorAll('.mat-mdc-list-item-title')[0];
    expect(primaryElem.textContent).toBe(primary);
    const secondaryElem: Element = item.querySelectorAll('.mat-mdc-list-item-line')[0];
    expect(secondaryElem.textContent).toBe(secondary);
  }

  setupProjectData(): void {
    this.realtimeService.addSnapshot<SFProjectProfile>(SFProjectProfileDoc.COLLECTION, {
      id: 'project01',
      data: createTestProjectProfile({
        userRoles: {
          user01: SFProjectRole.ParatextTranslator
        }
      })
    });
  }

  setupUserData(userId: string = 'user01', projects: string[] = ['project01']): void {
    this.realtimeService.addSnapshot<User>(UserDoc.COLLECTION, {
      id: userId,
      data: createTestUser({
        sites: {
          sf: {
            projects
          }
        }
      })
    });
  }
}
