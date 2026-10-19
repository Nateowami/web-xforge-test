import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { firstValueFrom, of } from 'rxjs';
import { anything, deepEqual, mock, verify, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import {
  DraftNavigationAuthGuard,
  NmtDraftAuthGuard,
  RouterGuard,
  SettingsAuthGuard,
  SyncAuthGuard,
  TranslateAuthGuard,
  UsersAuthGuard
} from './project-router.guard';

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
    const env = new GuardTestEnvironment(SyncAuthGuard, false);
    expect(
      env.service.check({
        data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextAdministrator } })
      } as SFProjectProfileDoc)
    ).toBe(true);
  });

  it('translators can access sync', async () => {
    // navigate away
    const env = new GuardTestEnvironment(SyncAuthGuard, false);
    expect(
      env.service.check({
        data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextTranslator } })
      } as SFProjectProfileDoc)
    ).toBe(true);
  });

  it('consultants cannot access sync', async () => {
    // navigate away
    const env = new GuardTestEnvironment(SyncAuthGuard, false);
    expect(
      env.service.check({
        data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextConsultant } })
      } as SFProjectProfileDoc)
    ).toBe(false);
  });

  it('serval administrators can access sync on resources they have read access to', async () => {
    const env = new GuardTestEnvironment(SyncAuthGuard, true);
    expect(
      env.service.check({
        data: createTestProjectProfile({
          userRoles: { user01: SFProjectRole.ParatextObserver },
          paratextId: 'ResourceResource'
        })
      } as SFProjectProfileDoc)
    ).toBe(true);
  });

  it('serval administrators can access sync on projects they are not a member of', async () => {
    const env = new GuardTestEnvironment(SyncAuthGuard, true);
    expect(
      env.service.check({
        data: createTestProjectProfile({ userRoles: {} })
      } as SFProjectProfileDoc)
    ).toBe(true);
  });
});

describe('NmtDraftAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService },
      { provide: Router, useMock: mockedRouter }
    ]
  }));

  it('allows translators to open drafting', async () => {
    const env = new CanActivateTestEnvironment(NmtDraftAuthGuard, SFProjectRole.ParatextTranslator);
    expect(await env.canActivate()).toBe(true);
    verify(mockedRouter.navigate(anything(), anything())).never();
  });

  it('redirects to the project when the user cannot edit texts', async () => {
    const env = new CanActivateTestEnvironment(NmtDraftAuthGuard, SFProjectRole.ParatextConsultant);
    expect(await env.canActivate()).toBe(false);
    verify(mockedRouter.navigate(deepEqual(['/projects', 'project01']), deepEqual({ replaceUrl: true }))).once();
  });

  it('does not redirect when checking access for the navigation menu', async () => {
    const env = new CanActivateTestEnvironment(NmtDraftAuthGuard, SFProjectRole.ParatextConsultant);
    expect(await firstValueFrom(env.service.allowTransition('project01'))).toBe(false);
    verify(mockedRouter.navigate(anything(), anything())).never();
  });

  it('does not redirect when the user is logged out', async () => {
    const env = new CanActivateTestEnvironment(NmtDraftAuthGuard, SFProjectRole.ParatextConsultant, false);
    expect(await env.canActivate()).toBe(false);
    verify(mockedRouter.navigate(anything(), anything())).never();
  });
});

describe('TranslateAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: AuthService, useMock: mockedAuthService },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService },
      { provide: Router, useMock: mockedRouter }
    ]
  }));

  it('redirects to the project when the user cannot access translate', async () => {
    const env = new CanActivateTestEnvironment(TranslateAuthGuard, SFProjectRole.CommunityChecker);
    expect(await env.canActivate()).toBe(false);
    verify(mockedRouter.navigate(deepEqual(['/projects', 'project01']), deepEqual({ replaceUrl: true }))).once();
  });

  it('does not redirect from check', async () => {
    const env = new CanActivateTestEnvironment(TranslateAuthGuard, SFProjectRole.CommunityChecker);
    expect(env.service.check(await mockedProjectService.getProfile('project01'))).toBe(false);
    verify(mockedRouter.navigate(anything(), anything())).never();
  });
});

// SettingsAuthGuard and UsersAuthGuard share the same access rule
for (const guardType of [SettingsAuthGuard, UsersAuthGuard]) {
  describe(guardType.name, () => {
    configureTestingModule(() => ({
      providers: [
        { provide: AuthGuard, useMock: mockedAuthGuard },
        { provide: AuthService, useMock: mockedAuthService },
        { provide: SFProjectService, useMock: mockedProjectService },
        { provide: UserService, useMock: mockedUserService },
        { provide: Router, useMock: mockedRouter }
      ]
    }));

    it('redirects translators to the project', async () => {
      const env = new CanActivateTestEnvironment(guardType, SFProjectRole.ParatextTranslator);
      when(mockedAuthService.currentUserRoles).thenReturn([SystemRole.User]);
      expect(await env.canActivate()).toBe(false);
      verify(mockedRouter.navigate(deepEqual(['/projects', 'project01']), deepEqual({ replaceUrl: true }))).once();
    });

    it('administrators can access', async () => {
      const env = new GuardTestEnvironment(guardType, false);
      expect(
        env.service.check({
          data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextAdministrator } })
        } as SFProjectProfileDoc)
      ).toBe(true);
    });

    it('translators cannot access', async () => {
      const env = new GuardTestEnvironment(guardType, false);
      expect(
        env.service.check({
          data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextTranslator } })
        } as SFProjectProfileDoc)
      ).toBe(false);
    });

    it('serval administrators can access on projects they are not a member of', async () => {
      const env = new GuardTestEnvironment(guardType, true);
      expect(
        env.service.check({
          data: createTestProjectProfile({ userRoles: {} })
        } as SFProjectProfileDoc)
      ).toBe(true);
    });
  });
}

class DraftNavigationTestEnvironment {
  service: DraftNavigationAuthGuard;
  constructor() {
    this.service = TestBed.inject(DraftNavigationAuthGuard);
  }
}

class CanActivateTestEnvironment<T extends RouterGuard> {
  service: T;
  constructor(guardType: Type<T>, role: SFProjectRole, isLoggedIn: boolean = true) {
    this.service = TestBed.inject(guardType);
    when(mockedUserService.currentUserId).thenReturn('user01');
    when(mockedAuthGuard.canActivate(anything(), anything())).thenReturn(of(isLoggedIn));
    when(mockedAuthGuard.allowTransition()).thenReturn(of(isLoggedIn));
    when(mockedProjectService.getProfile('project01')).thenResolve({
      id: 'project01',
      data: createTestProjectProfile({ userRoles: { user01: role } })
    } as SFProjectProfileDoc);
  }

  canActivate(): Promise<boolean> {
    const route = { params: { projectId: 'project01' } } as unknown as ActivatedRouteSnapshot;
    return firstValueFrom(this.service.canActivate(route, {} as RouterStateSnapshot));
  }
}

class GuardTestEnvironment<T> {
  service: T;
  constructor(guardType: Type<T>, servalAdmin: boolean) {
    this.service = TestBed.inject(guardType);
    when(mockedUserService.currentUserId).thenReturn('user01');
    when(mockedAuthService.currentUserRoles).thenReturn(servalAdmin ? [SystemRole.ServalAdmin] : [SystemRole.User]);
  }
}
