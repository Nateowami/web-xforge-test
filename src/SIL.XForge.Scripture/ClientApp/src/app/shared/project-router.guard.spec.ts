import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { of } from 'rxjs';
import { anything, deepEqual, mock, verify, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import { DraftNavigationAuthGuard, NmtDraftAuthGuard, SyncAuthGuard } from './project-router.guard';

const mockedAuthGuard = mock(AuthGuard);
const mockedAuthService = mock(AuthService);
const mockedProjectService = mock(SFProjectService);
const mockedUserService = mock(UserService);
const mockedRouter = mock(Router);

describe('DraftNavigationAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: SFProjectService, useMock: mockedProjectService }
    ]
  }));

  it('can navigate away when no changes', async () => {
    // navigate away
    const env = new DraftNavigationTestEnvironment();
    expect(await env.service.canDeactivate({ confirmLeave: () => Promise.resolve(true) })).toBe(true);
  });

  it('can shows prompt and stay on page', async () => {
    // navigate away
    const env = new DraftNavigationTestEnvironment();
    expect(await env.service.canDeactivate({ confirmLeave: () => Promise.resolve(false) })).toBe(false);
  });
});

describe('SyncAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: AuthService, useMock: mockedAuthService },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService }
    ]
  }));

  it('administrators can access sync', async () => {
    // navigate away
    const env = new SyncAuthGuardTestEnvironment(false);
    expect(
      env.service.check({
        data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextAdministrator } })
      } as SFProjectProfileDoc)
    ).toBe(true);
  });

  it('translators can access sync', async () => {
    // navigate away
    const env = new SyncAuthGuardTestEnvironment(false);
    expect(
      env.service.check({
        data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextTranslator } })
      } as SFProjectProfileDoc)
    ).toBe(true);
  });

  it('consultants cannot access sync', async () => {
    // navigate away
    const env = new SyncAuthGuardTestEnvironment(false);
    expect(
      env.service.check({
        data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextConsultant } })
      } as SFProjectProfileDoc)
    ).toBe(false);
  });

  it('serval administrators can sync resources they have read access to', async () => {
    // navigate away
    const env = new SyncAuthGuardTestEnvironment(true);
    expect(
      env.service.check({
        data: createTestProjectProfile({
          userRoles: { user01: SFProjectRole.ParatextObserver },
          paratextId: 'ResourceResource'
        })
      } as SFProjectProfileDoc)
    ).toBe(true);
  });

  it('serval administrators cannot sync projects they have read access to', async () => {
    // navigate away
    const env = new SyncAuthGuardTestEnvironment(true);
    expect(
      env.service.check({
        data: createTestProjectProfile({
          userRoles: { user01: SFProjectRole.ParatextObserver }
        })
      } as SFProjectProfileDoc)
    ).toBe(false);
  });
});

describe('NmtDraftAuthGuard', () => {
  const project01 = 'project01';
  const user01 = 'user01';

  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: Router, useMock: mockedRouter },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService }
    ]
  }));

  it('translators can activate', fakeAsync(() => {
    const env = new NmtDraftTestEnvironment(SFProjectRole.ParatextTranslator);
    let result: boolean | undefined;
    env.service.canActivate(env.routeSnapshot, {} as RouterStateSnapshot).subscribe(r => (result = r));
    tick();

    expect(result).toBe(true);
    verify(mockedRouter.navigate(anything(), anything())).never();
  }));

  // A user whose Paratext role changes to one without editing rights (e.g. Translator to Reviewer) can be left on the
  // draft page, or reload it. Cancelling the navigation without redirecting would show them a blank page.
  it('redirects to the project when the user cannot access drafting', fakeAsync(() => {
    const env = new NmtDraftTestEnvironment(SFProjectRole.ParatextConsultant);
    let result: boolean | undefined;
    env.service.canActivate(env.routeSnapshot, {} as RouterStateSnapshot).subscribe(r => (result = r));
    tick();

    expect(result).toBe(false);
    verify(mockedRouter.navigate(deepEqual(['/projects', project01]), deepEqual({ replaceUrl: true }))).once();
  }));

  it('does not redirect when the user is not logged in', fakeAsync(() => {
    const env = new NmtDraftTestEnvironment(SFProjectRole.ParatextTranslator, false);
    let result: boolean | undefined;
    env.service.canActivate(env.routeSnapshot, {} as RouterStateSnapshot).subscribe(r => (result = r));
    tick();

    expect(result).toBe(false);
    verify(mockedRouter.navigate(anything(), anything())).never();
  }));

  class NmtDraftTestEnvironment {
    readonly service: NmtDraftAuthGuard;
    readonly routeSnapshot: ActivatedRouteSnapshot;

    constructor(role: SFProjectRole, isLoggedIn: boolean = true) {
      this.service = TestBed.inject(NmtDraftAuthGuard);
      when(mockedAuthGuard.canActivate(anything(), anything())).thenReturn(of(isLoggedIn));
      when(mockedAuthGuard.allowTransition()).thenReturn(of(isLoggedIn));
      when(mockedUserService.currentUserId).thenReturn(user01);
      when(mockedProjectService.getProfile(project01)).thenResolve({
        data: createTestProjectProfile({ userRoles: { user01: role } })
      } as SFProjectProfileDoc);

      this.routeSnapshot = new ActivatedRouteSnapshot();
      this.routeSnapshot.params = { projectId: project01 };
    }
  }
});

class DraftNavigationTestEnvironment {
  service: DraftNavigationAuthGuard;
  constructor() {
    this.service = TestBed.inject(DraftNavigationAuthGuard);
  }
}

class SyncAuthGuardTestEnvironment {
  service: SyncAuthGuard;
  constructor(servalAdmin: boolean) {
    this.service = TestBed.inject(SyncAuthGuard);
    when(mockedUserService.currentUserId).thenReturn('user01');
    if (servalAdmin) {
      when(mockedAuthService.currentUserRoles).thenReturn([SystemRole.ServalAdmin]);
    } else {
      when(mockedAuthService.currentUserRoles).thenReturn([SystemRole.User]);
    }
  }
}
