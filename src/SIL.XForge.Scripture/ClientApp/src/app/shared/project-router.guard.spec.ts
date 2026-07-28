import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Params, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { firstValueFrom, of } from 'rxjs';
import { anything, deepEqual, mock, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import { DraftNavigationAuthGuard, ProjectAuthGuard, SyncAuthGuard, UsersAuthGuard } from './project-router.guard';

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

describe('project route guards', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: Router, useMock: mockedRouter },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService }
    ]
  }));

  it('sends a user without permission for the page to the project', async () => {
    const env = new RouteGuardTestEnvironment();
    env.setProject({ userRoles: { user01: SFProjectRole.ParatextObserver } });

    expect(await env.canActivate(TestBed.inject(UsersAuthGuard))).toBe(env.projectUrlTree);
  });

  it('sends a user who cannot read the project to their project list', async () => {
    const env = new RouteGuardTestEnvironment();
    // the realtime server rejects the subscription when the user is not on the project
    when(mockedProjectService.getProfile('project01')).thenReject(new Error('403: Permission denied (read)'));

    expect(await env.canActivate(TestBed.inject(UsersAuthGuard))).toBe(env.projectUrlTree);
    expect(await env.canActivate(TestBed.inject(ProjectAuthGuard))).toBe(env.projectListUrlTree);
  });

  it('sends a user to their project list when the project does not exist', async () => {
    const env = new RouteGuardTestEnvironment();
    when(mockedProjectService.getProfile('project01')).thenResolve({
      id: 'project01',
      data: undefined
    } as SFProjectProfileDoc);

    expect(await env.canActivate(TestBed.inject(ProjectAuthGuard))).toBe(env.projectListUrlTree);
  });

  it('allows a user onto the project route when they are on the project', async () => {
    const env = new RouteGuardTestEnvironment();
    env.setProject({ userRoles: { user01: SFProjectRole.ParatextObserver } });

    expect(await env.canActivate(TestBed.inject(ProjectAuthGuard))).toBe(true);
  });

  it('leaves old sharing links to the project route, which redirects them to the join page', async () => {
    const env = new RouteGuardTestEnvironment();
    // the user is not on the project yet, so reading it fails
    when(mockedProjectService.getProfile('project01')).thenReject(new Error('403: Permission denied (read)'));

    expect(await env.canActivate(TestBed.inject(ProjectAuthGuard), { sharing: 'true' })).toBe(true);
  });
});

class RouteGuardTestEnvironment {
  readonly projectUrlTree = new UrlTree();
  readonly projectListUrlTree = new UrlTree();

  constructor() {
    when(mockedUserService.currentUserId).thenReturn('user01');
    when(mockedAuthGuard.canActivate(anything(), anything())).thenReturn(of(true));
    when(mockedAuthGuard.allowTransition()).thenReturn(of(true));
    when(mockedRouter.createUrlTree(deepEqual(['/projects', 'project01']))).thenReturn(this.projectUrlTree);
    when(mockedRouter.createUrlTree(deepEqual(['/projects']))).thenReturn(this.projectListUrlTree);
  }

  setProject(project: Partial<Parameters<typeof createTestProjectProfile>[0]>): void {
    when(mockedProjectService.getProfile('project01')).thenResolve({
      id: 'project01',
      data: createTestProjectProfile(project)
    } as SFProjectProfileDoc);
  }

  canActivate(
    guard: { canActivate: typeof UsersAuthGuard.prototype.canActivate },
    queryParams: Params = {}
  ): Promise<boolean | UrlTree> {
    const snapshot = new ActivatedRouteSnapshot();
    snapshot.params = { projectId: 'project01' };
    snapshot.queryParams = queryParams;
    return firstValueFrom(guard.canActivate(snapshot, {} as RouterStateSnapshot));
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
