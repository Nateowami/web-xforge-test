import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RedirectCommand, Router, RouterStateSnapshot } from '@angular/router';
import { createTestUser } from 'realtime-server/lib/esm/common/models/user-test-data';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { firstValueFrom, of } from 'rxjs';
import { anything, mock, verify, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { UserDoc } from 'xforge-common/models/user-doc';
import { configureTestingModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import {
  DraftNavigationAuthGuard,
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

describe('DraftNavigationAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: AuthService, useMock: mockedAuthService },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService }
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

// SettingsAuthGuard and UsersAuthGuard share the same access rule
for (const guardType of [SettingsAuthGuard, UsersAuthGuard]) {
  describe(guardType.name, () => {
    configureTestingModule(() => ({
      providers: [
        { provide: AuthGuard, useMock: mockedAuthGuard },
        { provide: AuthService, useMock: mockedAuthService },
        { provide: SFProjectService, useMock: mockedProjectService },
        { provide: UserService, useMock: mockedUserService }
      ]
    }));

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

describe('RouterGuard canActivate', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: AuthService, useMock: mockedAuthService },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService }
    ]
  }));

  it('allows a project administrator', async () => {
    const env = new CanActivateTestEnvironment({ memberOf: ['project01'], role: SFProjectRole.ParatextAdministrator });
    expect(await env.canActivate(UsersAuthGuard)).toBe(true);
  });

  it('redirects a project member without access to the project', async () => {
    const env = new CanActivateTestEnvironment({ memberOf: ['project01'], role: SFProjectRole.ParatextTranslator });
    env.expectRedirect(await env.canActivate(UsersAuthGuard), '/projects/project01');
  });

  it('redirects a user who is not on the project to my projects without reading the project', async () => {
    const env = new CanActivateTestEnvironment({ memberOf: [] });
    env.expectRedirect(await env.canActivate(UsersAuthGuard), '/projects');
    // The realtime server denies the read, which would show an error dialog
    verify(mockedProjectService.getProfile(anything())).never();
  });

  it('allows a serval administrator who is not on the project', async () => {
    const env = new CanActivateTestEnvironment({ memberOf: [], servalAdmin: true });
    expect(await env.canActivate(UsersAuthGuard)).toBe(true);
  });

  it('redirects to my projects when the project does not exist', async () => {
    const env = new CanActivateTestEnvironment({ memberOf: [], servalAdmin: true, projectExists: false });
    env.expectRedirect(await env.canActivate(UsersAuthGuard), '/projects');
  });

  it('refuses without redirecting when not logged in', async () => {
    const env = new CanActivateTestEnvironment({ memberOf: ['project01'], loggedIn: false });
    expect(await env.canActivate(UsersAuthGuard)).toBe(false);
    verify(mockedProjectService.getProfile(anything())).never();
  });

  it('redirects a translator who is not on the project away from translate', async () => {
    const env = new CanActivateTestEnvironment({ memberOf: [] });
    env.expectRedirect(await env.canActivate(TranslateAuthGuard), '/projects');
  });

  it('does not show navigation to a project the user is not on', async () => {
    new CanActivateTestEnvironment({ memberOf: [] });
    expect(await firstValueFrom(TestBed.inject(SyncAuthGuard).allowTransition('project01'))).toBe(false);
    verify(mockedProjectService.getProfile(anything())).never();
  });
});

class CanActivateTestEnvironment {
  constructor({
    memberOf,
    role,
    servalAdmin = false,
    projectExists = true,
    loggedIn = true
  }: {
    memberOf: string[];
    role?: SFProjectRole;
    servalAdmin?: boolean;
    projectExists?: boolean;
    loggedIn?: boolean;
  }) {
    when(mockedAuthGuard.canActivate(anything(), anything())).thenReturn(of(loggedIn));
    when(mockedAuthGuard.allowTransition()).thenReturn(of(loggedIn));
    when(mockedAuthService.currentUserRoles).thenReturn(servalAdmin ? [SystemRole.ServalAdmin] : [SystemRole.User]);
    when(mockedUserService.currentUserId).thenReturn('user01');
    when(mockedUserService.getCurrentUser()).thenResolve({
      data: createTestUser({ sites: { sf: { projects: memberOf } } })
    } as UserDoc);
    when(mockedProjectService.getProfile('project01')).thenResolve({
      id: 'project01',
      data: projectExists ? createTestProjectProfile({ userRoles: role == null ? {} : { user01: role } }) : undefined
    } as SFProjectProfileDoc);
  }

  canActivate(guardType: Type<RouterGuard>): Promise<boolean | RedirectCommand> {
    const snapshot = new ActivatedRouteSnapshot();
    snapshot.params = { projectId: 'project01' };
    return firstValueFrom(TestBed.inject(guardType).canActivate(snapshot, {} as RouterStateSnapshot));
  }

  expectRedirect(result: boolean | RedirectCommand, url: string): void {
    expect(result).toBeInstanceOf(RedirectCommand);
    const redirect = result as RedirectCommand;
    expect(TestBed.inject(Router).serializeUrl(redirect.redirectTo)).toEqual(url);
    expect(redirect.navigationBehaviorOptions?.replaceUrl).toBe(true);
  }
}

class DraftNavigationTestEnvironment {
  service: DraftNavigationAuthGuard;
  constructor() {
    this.service = TestBed.inject(DraftNavigationAuthGuard);
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
