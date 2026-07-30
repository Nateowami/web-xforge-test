import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { mock, when } from 'ts-mockito';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { OwnerComponent } from 'xforge-common/owner/owner.component';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
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

  describe('trigger', () => {
    it('should show the assignee with a custom trigger, not the option text content', fakeAsync(() => {
      // Material's default trigger uses the selected option's text content, which would include the
      // text inside the avatar (a user's initials when they have no avatar image)
      const env = new TestEnvironment({ value: CURRENT_USER_ID, currentUserId: CURRENT_USER_ID });
      env.wait();

      expect(env.triggerOwnerRef).toBe(CURRENT_USER_ID);
      expect(env.fixture.nativeElement.querySelector('.mat-mdc-select-min-line')).toBeNull();
    }));

    it('should show the unassigned text when nothing is selected', fakeAsync(() => {
      const env = new TestEnvironment({ value: '', currentUserId: CURRENT_USER_ID });
      env.wait();

      expect(env.triggerOwnerRef).toBeUndefined();
      expect(env.triggerText).toBe('Unassigned');
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

      this.fixture = TestBed.createComponent(TestHostComponent);
      this.host = this.fixture.componentInstance;
      this.host.value = value;
      this.host.knownAssigneeIds = knownAssigneeIds;
      this.host.currentUserId = currentUserId;
      this.component = this.fixture.debugElement.children[0]
        .componentInstance as OnboardingRequestAssigneeSelectComponent;
      this.fixture.detectChanges();
    }

    wait(): void {
      tick();
      this.fixture.detectChanges();
    }

    /** The owner the trigger is displaying, or undefined when it shows the unassigned text. */
    get triggerOwnerRef(): string | undefined {
      const owner = this.fixture.debugElement.query(By.css('mat-select-trigger app-owner'));
      return owner == null ? undefined : (owner.componentInstance as OwnerComponent).ownerRef;
    }

    get triggerText(): string {
      return this.fixture.debugElement
        .query(By.css('.mat-mdc-select-value'))
        .nativeElement.textContent.trim() as string;
    }
  }
});
