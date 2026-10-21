import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { UserProfile } from 'realtime-server/lib/esm/common/models/user';
import { createTestUserProfile } from 'realtime-server/lib/esm/common/models/user-test-data';
import { anything, mock, when } from 'ts-mockito';
import { UserProfileDoc } from 'xforge-common/models/user-profile-doc';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { provideTestRealtime } from 'xforge-common/test-realtime-providers';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SF_TYPE_REGISTRY } from '../../core/models/sf-type-registry';
import { OnboardingRequestAssigneeSelectComponent } from './onboarding-request-assignee-select.component';

const mockedUserService = mock(UserService);

const CURRENT_USER_ID = 'user01';
const ASSIGNEE_USER_ID = 'user02';
const OTHER_USER_ID = 'user03';

/** Host component used to drive the OnboardingRequestAssigneeSelectComponent under test. */
@Component({
  template: `<app-onboarding-request-assignee-select
    [value]="value"
    [knownAssigneeIds]="knownAssigneeIds"
    [currentUserId]="currentUserId"
    (selectionChange)="lastEmitted = $event"
  ></app-onboarding-request-assignee-select>`,
  imports: [OnboardingRequestAssigneeSelectComponent]
})
class TestHostComponent {
  value: string = '';
  knownAssigneeIds: string[] = [];
  currentUserId?: string;
  lastEmitted?: string;
}

describe('OnboardingRequestAssigneeSelectComponent', () => {
  configureTestingModule(() => ({
    imports: [TestHostComponent, getTestTranslocoModule()],
    providers: [
      provideTestRealtime(SF_TYPE_REGISTRY),
      provideTestOnlineStatus(),
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting(),
      { provide: OnlineStatusService, useClass: TestOnlineStatusService },
      { provide: UserService, useMock: mockedUserService }
    ]
  }));

  describe('getOptions()', () => {
    it('should include the current user in options', fakeAsync(() => {
      const env = new TestEnvironment({ currentUserId: CURRENT_USER_ID });
      env.wait();

      const options = env.component.getOptions();

      expect(options).toContain(CURRENT_USER_ID);
    }));

    it('should include a known assignee who is not the current user', fakeAsync(() => {
      const env = new TestEnvironment({ currentUserId: CURRENT_USER_ID, knownAssigneeIds: [ASSIGNEE_USER_ID] });
      env.wait();

      const options = env.component.getOptions();

      expect(options).toContain(CURRENT_USER_ID);
      expect(options).toContain(ASSIGNEE_USER_ID);
    }));

    it('should list the current user first', fakeAsync(() => {
      const env = new TestEnvironment({ currentUserId: CURRENT_USER_ID, knownAssigneeIds: [ASSIGNEE_USER_ID] });
      env.wait();

      const options = env.component.getOptions();

      expect(options[0]).toBe(CURRENT_USER_ID);
    }));

    it('should not duplicate the current user if they are also in knownAssigneeIds', fakeAsync(() => {
      const env = new TestEnvironment({
        currentUserId: CURRENT_USER_ID,
        knownAssigneeIds: [CURRENT_USER_ID, ASSIGNEE_USER_ID]
      });
      env.wait();

      const options = env.component.getOptions();

      expect(options.filter(id => id === CURRENT_USER_ID).length).toBe(1);
    }));

    it('should return only the current user when there are no known assignees', fakeAsync(() => {
      const env = new TestEnvironment({ currentUserId: CURRENT_USER_ID, knownAssigneeIds: [] });
      env.wait();

      const options = env.component.getOptions();

      expect(options).toEqual([CURRENT_USER_ID]);
    }));

    it('should return multiple known assignees after the current user', fakeAsync(() => {
      const env = new TestEnvironment({
        currentUserId: CURRENT_USER_ID,
        knownAssigneeIds: [ASSIGNEE_USER_ID, OTHER_USER_ID]
      });
      env.wait();

      const options = env.component.getOptions();

      expect(options).toEqual([CURRENT_USER_ID, ASSIGNEE_USER_ID, OTHER_USER_ID]);
    }));
  });

  describe('selected value', () => {
    // Users without an avatar image get an initials avatar, whose text must not end up in the closed select
    it('should show only "Me" when the current user is selected', fakeAsync(() => {
      const env = new TestEnvironment({ value: CURRENT_USER_ID, currentUserId: CURRENT_USER_ID });
      env.wait();

      expect(env.selectedText).toBe('Me');
    }));

    it('should show only the display name when another user is selected', fakeAsync(() => {
      const env = new TestEnvironment({
        value: ASSIGNEE_USER_ID,
        knownAssigneeIds: [ASSIGNEE_USER_ID],
        currentUserId: CURRENT_USER_ID
      });
      env.wait();

      expect(env.selectedText).toBe('Assignee User');
    }));

    it('should show Unassigned when no one is selected', fakeAsync(() => {
      const env = new TestEnvironment({ value: '', currentUserId: CURRENT_USER_ID });
      env.wait();

      expect(env.selectedText).toBe('Unassigned');
    }));

    it('should update the selected value when the assignee changes', fakeAsync(() => {
      const env = new TestEnvironment({
        value: CURRENT_USER_ID,
        knownAssigneeIds: [ASSIGNEE_USER_ID],
        currentUserId: CURRENT_USER_ID
      });
      env.wait();
      expect(env.selectedText).toBe('Me');

      env.host.value = ASSIGNEE_USER_ID;
      // Creates the owner component for the new assignee, which then loads its profile
      env.fixture.detectChanges();
      env.wait();

      expect(env.selectedText).toBe('Assignee User');
    }));
  });

  /**
   * Test environment for OnboardingRequestAssigneeSelectComponent tests.
   * Uses a TestHostComponent to drive inputs and capture output.
   */
  class TestEnvironment {
    readonly host: TestHostComponent;
    readonly fixture: ComponentFixture<TestHostComponent>;
    readonly component: OnboardingRequestAssigneeSelectComponent;

    constructor({
      value = '',
      knownAssigneeIds = [],
      currentUserId
    }: {
      value?: string;
      knownAssigneeIds?: string[];
      currentUserId?: string;
    } = {}) {
      when(mockedUserService.currentUserId).thenReturn(CURRENT_USER_ID);
      const realtimeService = TestBed.inject<TestRealtimeService>(TestRealtimeService);
      realtimeService.addSnapshots<UserProfile>(UserProfileDoc.COLLECTION, [
        { id: CURRENT_USER_ID, data: createTestUserProfile({ displayName: 'Current User', avatarUrl: '' }) },
        { id: ASSIGNEE_USER_ID, data: createTestUserProfile({ displayName: 'Assignee User', avatarUrl: '' }) }
      ]);
      when(mockedUserService.getProfile(anything())).thenCall(id =>
        realtimeService.subscribe(UserProfileDoc.COLLECTION, id)
      );

      this.fixture = TestBed.createComponent(TestHostComponent);
      this.host = this.fixture.componentInstance;
      this.host.value = value;
      this.host.knownAssigneeIds = knownAssigneeIds;
      this.host.currentUserId = currentUserId;
      this.component = this.fixture.debugElement.children[0]
        .componentInstance as OnboardingRequestAssigneeSelectComponent;
      this.fixture.detectChanges();
    }

    get selectedText(): string {
      return this.fixture.debugElement.query(By.css('.mat-mdc-select-value')).nativeElement.textContent.trim();
    }

    wait(): void {
      tick();
      this.fixture.detectChanges();
    }
  }
});
