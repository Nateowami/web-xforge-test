import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Params, Router, RouterStateSnapshot } from '@angular/router';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { of } from 'rxjs';
import { anything, mock, verify, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { DialogService } from 'xforge-common/dialog.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { PermissionsService } from '../core/permissions.service';
import { SFProjectService } from '../core/sf-project.service';
import { DraftNavigationAuthGuard, ProjectAuthGuard, SyncAuthGuard } from './project-router.guard';

const mockedAuthGuard = mock(AuthGuard);
const mockedAuthService = mock(AuthService);
const mockedProjectService = mock(SFProjectService);
const mockedUserService = mock(UserService);
const mockedDialogService = mock(DialogService);
const mockedPermissionsService = mock(PermissionsService);
const mockedRouter = mock(Router);

describe('DraftNavigationAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: DialogService, useMock: mockedDialogService },
      { provide: PermissionsService, useMock: mockedPermissionsService },
      { provide: Router, useMock: mockedRouter },
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
      { provide: DialogService, useMock: mockedDialogService },
      { provide: PermissionsService, useMock: mockedPermissionsService },
      { provide: Router, useMock: mockedRouter },
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

describe('ProjectAuthGuard', () => {
  const projectId = 'project01';
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: DialogService, useMock: mockedDialogService },
      { provide: PermissionsService, useMock: mockedPermissionsService },
      { provide: Router, useMock: mockedRouter },
      { provide: SFProjectService, useMock: mockedProjectService }
    ]
  }));

  it('allows a member of the project through', fakeAsync(() => {
    const env = new ProjectAuthGuardTestEnvironment();
    when(mockedProjectService.getProfile(projectId)).thenResolve({
      data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.ParatextTranslator } })
    } as SFProjectProfileDoc);

    let result: boolean | undefined;
    env.service.canActivate(env.routeSnapshot(), {} as RouterStateSnapshot).subscribe(value => (result = value));
    tick();

    expect(result).toBe(true);
    verify(mockedRouter.navigateByUrl(anything(), anything())).never();
    verify(mockedDialogService.message(anything())).never();
  }));

  it('tells a user who is not a member of the project, and sends them to their projects', fakeAsync(() => {
    const env = new ProjectAuthGuardTestEnvironment();
    when(mockedProjectService.getProfile(projectId)).thenReject(new Error('403: Permission denied (read)'));
    when(mockedPermissionsService.isUserOnProject(projectId)).thenResolve(false);

    let result: boolean | undefined;
    env.service.canActivate(env.routeSnapshot(), {} as RouterStateSnapshot).subscribe(value => (result = value));
    tick();

    expect(result).toBe(false);
    verify(mockedRouter.navigateByUrl('/projects', anything())).once();
    verify(mockedDialogService.message('app.not_a_project_member')).once();
  }));

  it('tells a user when the project does not exist, and sends them to their projects', fakeAsync(() => {
    const env = new ProjectAuthGuardTestEnvironment();
    when(mockedProjectService.getProfile(projectId)).thenResolve({ data: undefined } as SFProjectProfileDoc);

    let result: boolean | undefined;
    env.service.canActivate(env.routeSnapshot(), {} as RouterStateSnapshot).subscribe(value => (result = value));
    tick();

    expect(result).toBe(false);
    verify(mockedRouter.navigateByUrl('/projects', anything())).once();
    verify(mockedDialogService.message('app.project_has_been_deleted')).once();
  }));

  it('reports an unexpected error for a member of the project', fakeAsync(() => {
    const env = new ProjectAuthGuardTestEnvironment();
    when(mockedProjectService.getProfile(projectId)).thenReject(new Error('unexpected'));
    when(mockedPermissionsService.isUserOnProject(projectId)).thenResolve(true);

    let error: Error | undefined;
    env.service
      .canActivate(env.routeSnapshot(), {} as RouterStateSnapshot)
      .subscribe({ error: (err: Error) => (error = err) });
    tick();

    expect(error?.message).toBe('unexpected');
    verify(mockedDialogService.message(anything())).never();
  }));

  it('does not check the project for old style sharing links', fakeAsync(() => {
    const env = new ProjectAuthGuardTestEnvironment();

    let result: boolean | undefined;
    env.service
      .canActivate(env.routeSnapshot({ sharing: 'true' }), {} as RouterStateSnapshot)
      .subscribe(value => (result = value));
    tick();

    expect(result).toBe(true);
    verify(mockedProjectService.getProfile(anything())).never();
  }));

  class ProjectAuthGuardTestEnvironment {
    readonly service: ProjectAuthGuard;

    constructor() {
      this.service = TestBed.inject(ProjectAuthGuard);
      when(mockedAuthGuard.canActivate(anything(), anything())).thenReturn(of(true));
      when(mockedAuthGuard.allowTransition()).thenReturn(of(true));
      when(mockedUserService.currentUserId).thenReturn('user01');
    }

    routeSnapshot(queryParams: Params = {}): ActivatedRouteSnapshot {
      const snapshot = new ActivatedRouteSnapshot();
      snapshot.params = { projectId };
      snapshot.queryParams = queryParams;
      return snapshot;
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
