import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { firstValueFrom, of } from 'rxjs';
import { anything, mock, resetCalls, verify, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { DialogService } from 'xforge-common/dialog.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import {
  DraftNavigationAuthGuard,
  ProjectAuthGuard,
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
const mockedDialogService = mock(DialogService);

describe('RouterGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: AuthService, useMock: mockedAuthService },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService },
      { provide: Router, useMock: mockedRouter },
      { provide: DialogService, useMock: mockedDialogService }
    ]
  }));

  beforeEach(() => {
    resetCalls(mockedRouter);
    resetCalls(mockedDialogService);
    resetCalls(mockedProjectService);
    when(mockedAuthGuard.canActivate(anything(), anything())).thenReturn(of(true));
    when(mockedAuthGuard.allowTransition()).thenReturn(of(true));
  });

  it('sends a user who is not a member of the project to the projects page', async () => {
    when(mockedProjectService.getProfile('project01')).thenReject(
      new Error('403: Permission denied (read), collection: sf_projects, docId: project01')
    );
    const guard = TestBed.inject(TranslateAuthGuard);

    expect(await firstValueFrom(guard.canActivate(routeTo('project01'), {} as RouterStateSnapshot))).toBe(false);
    verify(mockedRouter.navigateByUrl('/projects', anything())).once();
    verify(mockedDialogService.message('app.not_a_project_member')).once();
  });

  it('does not hide other errors loading the project', async () => {
    when(mockedProjectService.getProfile('project01')).thenReject(new Error('Something else went wrong'));
    const guard = TestBed.inject(TranslateAuthGuard);

    await expectAsync(
      firstValueFrom(guard.canActivate(routeTo('project01'), {} as RouterStateSnapshot))
    ).toBeRejectedWithError('Something else went wrong');
    verify(mockedRouter.navigateByUrl(anything(), anything())).never();
    verify(mockedDialogService.message(anything())).never();
  });

  it('lets a project member open the project', async () => {
    when(mockedProjectService.getProfile('project01')).thenResolve({
      id: 'project01',
      data: createTestProjectProfile({ userRoles: { user01: SFProjectRole.CommunityChecker } })
    } as SFProjectProfileDoc);
    const guard = TestBed.inject(ProjectAuthGuard);

    expect(await firstValueFrom(guard.canActivate(routeTo('project01'), {} as RouterStateSnapshot))).toBe(true);
  });

  it('lets old sharing links through without loading the project', async () => {
    const guard = TestBed.inject(ProjectAuthGuard);

    expect(
      await firstValueFrom(
        guard.canActivate(routeTo('project01', { sharing: 'true', shareKey: 'key01' }), {} as RouterStateSnapshot)
      )
    ).toBe(true);
    verify(mockedProjectService.getProfile(anything())).never();
  });
});

describe('DraftNavigationAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: DialogService, useMock: mockedDialogService }
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
      { provide: UserService, useMock: mockedUserService },
      { provide: DialogService, useMock: mockedDialogService }
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
        { provide: UserService, useMock: mockedUserService },
        { provide: DialogService, useMock: mockedDialogService }
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

function routeTo(projectId: string, queryParams: Record<string, string> = {}): ActivatedRouteSnapshot {
  return { params: { projectId }, queryParams } as unknown as ActivatedRouteSnapshot;
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
