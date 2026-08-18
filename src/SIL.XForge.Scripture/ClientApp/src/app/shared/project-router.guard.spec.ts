import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { firstValueFrom, of } from 'rxjs';
import { anything, mock, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import { DraftNavigationAuthGuard, SettingsAuthGuard, SyncAuthGuard } from './project-router.guard';

const mockedAuthGuard = mock(AuthGuard);
const mockedAuthService = mock(AuthService);
const mockedProjectService = mock(SFProjectService);
const mockedUserService = mock(UserService);

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

describe('RouterGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService }
    ]
  }));

  it('activates the route when the user is permitted to view the page', async () => {
    const env = new RouterGuardTestEnvironment(SFProjectRole.ParatextAdministrator);
    expect(await env.canActivate()).toBe(true);
  });

  it('redirects to the project instead of showing a blank page when the user is not permitted', async () => {
    const env = new RouterGuardTestEnvironment(SFProjectRole.ParatextTranslator);
    const result = await env.canActivate();
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toEqual('/projects/project01');
  });

  it('blocks the route while the user is being sent to log in', async () => {
    const env = new RouterGuardTestEnvironment(SFProjectRole.ParatextAdministrator, false);
    expect(await env.canActivate()).toBe(false);
  });
});

class RouterGuardTestEnvironment {
  readonly service: SettingsAuthGuard;

  constructor(role: SFProjectRole, isLoggedIn: boolean = true) {
    this.service = TestBed.inject(SettingsAuthGuard);
    when(mockedUserService.currentUserId).thenReturn('user01');
    when(mockedAuthGuard.canActivate(anything(), anything())).thenReturn(of(isLoggedIn));
    when(mockedAuthGuard.allowTransition()).thenReturn(of(isLoggedIn));
    when(mockedProjectService.getProfile('project01')).thenResolve({
      id: 'project01',
      data: createTestProjectProfile({ userRoles: { user01: role } })
    } as SFProjectProfileDoc);
  }

  canActivate(): Promise<boolean | UrlTree> {
    const route = { params: { projectId: 'project01' } } as unknown as ActivatedRouteSnapshot;
    return firstValueFrom(this.service.canActivate(route, {} as RouterStateSnapshot));
  }
}

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
