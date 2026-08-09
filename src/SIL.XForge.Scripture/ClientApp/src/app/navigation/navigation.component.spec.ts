import { DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { anything, mock, when } from 'ts-mockito';
import { ActivatedProjectService } from 'xforge-common/activated-project.service';
import { createTestFeatureFlag, FeatureFlagService } from 'xforge-common/feature-flags/feature-flag.service';
import { I18nService } from 'xforge-common/i18n.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { ResumeCheckingService } from '../checking/checking/resume-checking.service';
import { ResumeTranslateService } from '../checking/checking/resume-translate.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import { NmtDraftAuthGuard, SettingsAuthGuard, SyncAuthGuard, UsersAuthGuard } from '../shared/project-router.guard';
import { NavigationComponent } from './navigation.component';

describe('NavigationComponent', () => {
  const mockedSettingsAuthGuard = mock(SettingsAuthGuard);
  const mockedSyncAuthGuard = mock(SyncAuthGuard);
  const mockedUsersAuthGuard = mock(UsersAuthGuard);
  const mockedNmtDraftAuthGuard = mock(NmtDraftAuthGuard);
  const mockedActivatedProjectService = mock(ActivatedProjectService);
  const mockedUserService = mock(UserService);
  const mockedResumeCheckingService = mock(ResumeCheckingService);
  const mockedResumeTranslateService = mock(ResumeTranslateService);
  const mockedRouter = mock(Router);
  const mockedActivatedRoute = mock(ActivatedRoute);
  const mockedI18nService = mock(I18nService);
  const mockedFeatureFlagService = mock(FeatureFlagService);
  const mockedProjectService = mock(SFProjectService);

  configureTestingModule(() => ({
    imports: [NavigationComponent, getTestTranslocoModule()],
    providers: [
      provideTestOnlineStatus(),
      { provide: SettingsAuthGuard, useMock: mockedSettingsAuthGuard },
      { provide: SyncAuthGuard, useMock: mockedSyncAuthGuard },
      { provide: UsersAuthGuard, useMock: mockedUsersAuthGuard },
      { provide: NmtDraftAuthGuard, useMock: mockedNmtDraftAuthGuard },
      { provide: ActivatedProjectService, useMock: mockedActivatedProjectService },
      { provide: OnlineStatusService, useClass: TestOnlineStatusService },
      { provide: UserService, useMock: mockedUserService },
      { provide: ResumeCheckingService, useMock: mockedResumeCheckingService },
      { provide: ResumeTranslateService, useMock: mockedResumeTranslateService },
      { provide: Router, useMock: mockedRouter },
      { provide: ActivatedRoute, useMock: mockedActivatedRoute },
      { provide: I18nService, useMock: mockedI18nService },
      { provide: FeatureFlagService, useMock: mockedFeatureFlagService },
      { provide: SFProjectService, useMock: mockedProjectService }
    ]
  }));

  class TestEnvironment {
    readonly fixture: ComponentFixture<NavigationComponent>;
    readonly component: NavigationComponent;

    readonly changes$ = new Subject<SFProjectProfileDoc | undefined>();
    readonly canSeeSettings$ = new BehaviorSubject<boolean>(false);
    readonly canSeeUsers$ = new BehaviorSubject<boolean>(false);
    readonly canSync$ = new BehaviorSubject<boolean>(false);
    readonly canGenerateDraft$ = new BehaviorSubject<boolean>(false);

    constructor() {
      when(mockedActivatedProjectService.changes$).thenReturn(this.changes$);
      when(mockedActivatedProjectService.projectDoc).thenReturn(undefined);
      when(mockedSettingsAuthGuard.allowTransition(anything())).thenReturn(this.canSeeSettings$);
      when(mockedSyncAuthGuard.allowTransition(anything())).thenReturn(this.canSync$);
      when(mockedUsersAuthGuard.allowTransition(anything())).thenReturn(this.canSeeUsers$);
      when(mockedNmtDraftAuthGuard.allowTransition(anything())).thenReturn(this.canGenerateDraft$);
      when(mockedUserService.currentUserId).thenReturn('user01');
      when(mockedRouter.url).thenReturn('/projects/project01');
      when(mockedRouter.createUrlTree(anything(), anything())).thenReturn([] as any);
      when(mockedRouter.serializeUrl(anything())).thenReturn('');
      when(mockedResumeCheckingService.resumeLink$).thenReturn(of([]));
      when(mockedResumeTranslateService.resumeLink$).thenReturn(of([]));
      when(mockedFeatureFlagService.stillness).thenReturn(createTestFeatureFlag(false));
      when(mockedProjectService.isSyncRequestPending(anything())).thenReturn(false);

      this.fixture = TestBed.createComponent(NavigationComponent);
      this.component = this.fixture.componentInstance;
      this.fixture.detectChanges();
    }

    get adminPagesList(): DebugElement | null {
      return this.fixture.debugElement.query(By.css('#admin-pages-menu-list'));
    }

    get syncIconSpinning(): boolean {
      const icon: DebugElement | null = this.fixture.debugElement.query(By.css('#sync-icon'));
      return icon != null && icon.nativeElement.classList.contains('sync-in-progress');
    }

    projectDocWithQueuedCount(queuedCount: number): SFProjectProfileDoc {
      return {
        id: 'project01',
        data: createTestProjectProfile({ sync: { queuedCount } })
      } as SFProjectProfileDoc;
    }

    emitProjectChange(projectDoc: SFProjectProfileDoc | undefined): void {
      when(mockedActivatedProjectService.projectDoc).thenReturn(projectDoc);
      this.changes$.next(projectDoc);
      tick(50);
      this.fixture.detectChanges();
    }
  }

  it('hides the admin section when no project is active', fakeAsync(() => {
    const env = new TestEnvironment();
    env.emitProjectChange(undefined);
    expect(env.adminPagesList).toBeNull();
    flush();
  }));

  it('shows the admin section when at least one guard allows access', fakeAsync(() => {
    const env = new TestEnvironment();
    env.canSync$.next(true);
    env.emitProjectChange({ id: 'project01' } as SFProjectProfileDoc);

    expect(env.adminPagesList).not.toBeNull();
    flush();
  }));

  it('hides the admin section when all guards deny access', fakeAsync(() => {
    const env = new TestEnvironment();
    // All guard BehaviorSubjects start false
    env.emitProjectChange({ id: 'project01' } as SFProjectProfileDoc);

    expect(env.adminPagesList).toBeNull();
    flush();
  }));

  it('re-evaluates guards when changes$ re-emits for the same project', fakeAsync(() => {
    // Regression test: previously the component sourced from projectId$, which only emits on
    // project navigation. changes$ also emits on realtime document updates (e.g. role changes),
    // so the guards must be re-queried on each emission.
    const env = new TestEnvironment();
    const projectDoc = { id: 'project01' } as SFProjectProfileDoc;
    let callCount = 0;
    when(mockedSettingsAuthGuard.allowTransition(anything())).thenCall(() => {
      callCount++;
      return env.canSeeSettings$;
    });

    env.changes$.next(projectDoc); // first emission — leading throttle fires synchronously
    expect(callCount).toBe(1);

    env.changes$.next(projectDoc); // second emission — simulates a realtime role change
    tick(50);
    expect(callCount).toBe(2);

    flush();
  }));

  it('reflects a role change that removes admin access', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectDoc = { id: 'project01' } as SFProjectProfileDoc;

    env.canSync$.next(true);
    env.emitProjectChange(projectDoc);
    expect(env.adminPagesList).not.toBeNull();

    // Simulate the server revoking sync permission (e.g. role changed from Translator to Observer)
    when(mockedSyncAuthGuard.allowTransition(anything())).thenReturn(of(false));
    env.emitProjectChange(projectDoc);
    expect(env.adminPagesList).toBeNull();

    flush();
  }));

  it('spins the sync icon while the project doc reports a queued sync', fakeAsync(() => {
    const env = new TestEnvironment();
    env.canSync$.next(true);
    env.emitProjectChange(env.projectDocWithQueuedCount(1));

    expect(env.syncIconSpinning).toBe(true);
    flush();
  }));

  it('spins the sync icon as soon as a sync is requested, before the project doc reports it', fakeAsync(() => {
    // The server increments queuedCount before responding to the sync request, so the project doc does not report
    // the sync until the round-trip finishes, which can take several seconds.
    const env = new TestEnvironment();
    env.canSync$.next(true);
    env.emitProjectChange(env.projectDocWithQueuedCount(0));
    expect(env.syncIconSpinning).toBe(false);

    when(mockedProjectService.isSyncRequestPending(anything())).thenReturn(true);
    env.fixture.detectChanges();

    expect(env.syncIconSpinning).toBe(true);
    flush();
  }));

  it('throttles rapid changes$ emissions to one leading and one trailing call per window', fakeAsync(() => {
    const env = new TestEnvironment();
    const projectDoc = { id: 'project01' } as SFProjectProfileDoc;
    let callCount = 0;
    when(mockedSettingsAuthGuard.allowTransition(anything())).thenCall(() => {
      callCount++;
      return env.canSeeSettings$;
    });

    // Five emissions arrive before the 50 ms window expires
    for (let i = 0; i < 5; i++) {
      env.changes$.next(projectDoc);
    }

    // The leading emission is synchronous: guard called once before any tick
    expect(callCount).toBe(1);

    tick(50);
    // The trailing emission fires at the end of the window: guard called exactly twice, not five times
    expect(callCount).toBe(2);

    flush();
  }));
});
