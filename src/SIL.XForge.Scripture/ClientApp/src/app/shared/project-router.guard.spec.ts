import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { ProjectType } from 'realtime-server/lib/esm/scriptureforge/models/translate-config';
import { anything, mock, verify, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import { DraftNavigationAuthGuard, DraftSignupAuthGuard, SyncAuthGuard } from './project-router.guard';

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

describe('DraftSignupAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useMock: mockedAuthGuard },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: UserService, useMock: mockedUserService },
      { provide: Router, useMock: mockedRouter }
    ]
  }));

  it('administrators of a project without drafting can sign up', () => {
    const env = new DraftSignupTestEnvironment();
    expect(env.service.check(env.projectDoc(SFProjectRole.ParatextAdministrator, ProjectType.Standard, false))).toBe(
      true
    );
    verify(mockedRouter.navigate(anything(), anything())).never();
  });

  it('observers cannot sign up', () => {
    const env = new DraftSignupTestEnvironment();
    expect(env.service.check(env.projectDoc(SFProjectRole.ParatextObserver, ProjectType.Standard, false))).toBe(false);
  });

  it('back translation projects cannot sign up, and are sent to the drafting page', () => {
    const env = new DraftSignupTestEnvironment();
    expect(
      env.service.check(env.projectDoc(SFProjectRole.ParatextAdministrator, ProjectType.BackTranslation, false))
    ).toBe(false);
    verify(mockedRouter.navigate(anything(), anything())).once();
  });

  it('projects with drafting already approved cannot sign up, and are sent to the drafting page', () => {
    const env = new DraftSignupTestEnvironment();
    expect(env.service.check(env.projectDoc(SFProjectRole.ParatextAdministrator, ProjectType.Standard, true))).toBe(
      false
    );
    verify(mockedRouter.navigate(anything(), anything())).once();
  });
});

class DraftNavigationTestEnvironment {
  service: DraftNavigationAuthGuard;
  constructor() {
    this.service = TestBed.inject(DraftNavigationAuthGuard);
  }
}

class DraftSignupTestEnvironment {
  service: DraftSignupAuthGuard;
  constructor() {
    this.service = TestBed.inject(DraftSignupAuthGuard);
    when(mockedUserService.currentUserId).thenReturn('user01');
  }

  projectDoc(role: SFProjectRole, projectType: ProjectType, preTranslate: boolean): SFProjectProfileDoc {
    return {
      id: 'project01',
      data: createTestProjectProfile({
        userRoles: { user01: role },
        translateConfig: { projectType, preTranslate }
      })
    } as SFProjectProfileDoc;
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
