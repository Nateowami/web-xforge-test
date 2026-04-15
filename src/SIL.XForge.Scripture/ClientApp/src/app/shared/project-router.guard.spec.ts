import { TestBed } from '@angular/core/testing';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { instance, mock, when } from 'ts-mockito';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { UserService } from 'xforge-common/user.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { SFProjectService } from '../core/sf-project.service';
import {
  DraftNavigationAuthGuard,
  SettingsAuthGuard,
  SyncAuthGuard,
  UsersAuthGuard
} from './project-router.guard';

const mockedAuthGuard = mock(AuthGuard);
const mockedAuthService = mock(AuthService);
const mockedProjectService = mock(SFProjectService);
const mockedUserService = mock(UserService);

describe('Project Router Guards', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useValue: instance(mockedAuthGuard) },
      { provide: AuthService, useValue: instance(mockedAuthService) },
      { provide: SFProjectService, useValue: instance(mockedProjectService) },
      { provide: UserService, useValue: instance(mockedUserService) }
    ]
  }));

  describe('SettingsAuthGuard', () => {
    it('allows Serval admin access', () => {
      const env = new TestEnvironment({
        currentSystemRoles: [SystemRole.ServalAdmin],
        currentProjectRole: SFProjectRole.CommunityChecker
      });

      expect(env.settingsAuthGuard.check(env.projectDoc)).toBe(true);
    });
  });

  describe('UsersAuthGuard', () => {
    it('allows Serval admin access', () => {
      const env = new TestEnvironment({
        currentSystemRoles: [SystemRole.ServalAdmin],
        currentProjectRole: SFProjectRole.CommunityChecker
      });

      expect(env.usersAuthGuard.check(env.projectDoc)).toBe(true);
    });
  });

  describe('SyncAuthGuard', () => {
    it('allows Serval admin access', () => {
      const env = new TestEnvironment({
        currentSystemRoles: [SystemRole.ServalAdmin],
        currentProjectRole: SFProjectRole.None
      });

      expect(env.syncAuthGuard.check(env.projectDoc)).toBe(true);
    });
  });
});

describe('DraftNavigationAuthGuard', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: AuthGuard, useValue: instance(mockedAuthGuard) },
      { provide: SFProjectService, useValue: instance(mockedProjectService) }
    ]
  }));

  it('can navigate away when no changes', async () => {
    const service = TestBed.inject(DraftNavigationAuthGuard);
    expect(await service.canDeactivate({ confirmLeave: () => Promise.resolve(true) })).toBe(true);
  });

  it('can shows prompt and stay on page', async () => {
    const service = TestBed.inject(DraftNavigationAuthGuard);
    expect(await service.canDeactivate({ confirmLeave: () => Promise.resolve(false) })).toBe(false);
  });
});

class TestEnvironment {
  readonly projectDoc: SFProjectProfileDoc;
  readonly settingsAuthGuard: SettingsAuthGuard;
  readonly usersAuthGuard: UsersAuthGuard;
  readonly syncAuthGuard: SyncAuthGuard;

  constructor({
    currentSystemRoles = [],
    currentProjectRole = SFProjectRole.None
  }: {
    currentSystemRoles?: SystemRole[];
    currentProjectRole?: SFProjectRole;
  } = {}) {
    when(mockedAuthService.currentUserRoles).thenReturn(currentSystemRoles);
    when(mockedUserService.currentUserId).thenReturn('user01');
    this.projectDoc = {
      id: 'project01',
      data: {
        userRoles: {
          user01: currentProjectRole
        }
      }
    } as unknown as SFProjectProfileDoc;
    this.settingsAuthGuard = TestBed.inject(SettingsAuthGuard);
    this.usersAuthGuard = TestBed.inject(UsersAuthGuard);
    this.syncAuthGuard = TestBed.inject(SyncAuthGuard);
  }
}
