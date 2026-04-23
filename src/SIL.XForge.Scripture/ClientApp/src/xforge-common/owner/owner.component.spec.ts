import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, DebugElement, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { TranslocoService } from '@ngneat/transloco';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { User, UserProfile } from 'realtime-server/lib/esm/common/models/user';
import { createTestUser, createTestUserProfile } from 'realtime-server/lib/esm/common/models/user-test-data';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { AuthService } from 'xforge-common/auth.service';
import { DialogService } from 'xforge-common/dialog.service';
import { UserDoc } from 'xforge-common/models/user-doc';
import { UserProfileDoc } from 'xforge-common/models/user-profile-doc';
import { provideTestRealtime } from 'xforge-common/test-realtime-providers';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { SaUserDetailsDialogComponent } from '../system-administration/sa-user-details-dialog.component';
import { isSafari } from '../utils';
import { OwnerComponent } from './owner.component';

const mockedAuthService = mock(AuthService);
const mockedDialogService = mock(DialogService);

describe('OwnerComponent', () => {
  it('should create', () => {
    const template = '<app-owner ownerRef="user01"></app-owner>';
    const env = new TestEnvironment(template);
    expect(env.fixture.componentInstance).toBeTruthy();
  });

  it('displays owner name', fakeAsync(() => {
    const template = '<app-owner ownerRef="user01"></app-owner>';
    const env = new TestEnvironment(template);
    tick();
    env.fixture.detectChanges();
    expect(env.userName).toBe('User 01');
  }));

  it('displays Unknown owner name', fakeAsync(() => {
    // A user may be removed from the database, and so an ownerRef may refer to a user we can't find.
    const template = '<app-owner ownerRef="no-longer-known-user-id"></app-owner>';
    const env = new TestEnvironment(template);
    tick();
    env.fixture.detectChanges();
    expect(env.userName).toBe('checking.unknown_author');
  }));

  it('displays avatar', () => {
    const template = '<app-owner #checkingOwner ownerRef="user01" [includeAvatar]="true"></app-owner>';
    const env = new TestEnvironment(template);
    expect(env.avatar).toBeTruthy();
    expect(env.avatar.query(By.css('app-avatar'))).toBeTruthy();
    env.fixture.componentInstance.checkingOwner.includeAvatar = false;
    env.fixture.detectChanges();
    expect(env.avatar).toBeFalsy();
  });

  it('displays date/time ', () => {
    const template = '<app-owner #checkingOwner ownerRef="user01"></app-owner>';
    const env = new TestEnvironment(template);
    env.fixture.componentInstance.checkingOwner.dateTime = '';
    env.fixture.detectChanges();
    expect(env.fixture.debugElement.query(By.css('.layout .date-time'))).toBeNull();
    env.fixture.componentInstance.checkingOwner.dateTime = '2019-04-25T12:30:00';
    env.fixture.detectChanges();
    // As of Chromium 110 the space between the minutes and AM/PM is now a NARROW NO-BREAK SPACE (U+202F). Test for any
    // single whitespace character to maximize compatibility.
    if (isSafari()) {
      expect(env.dateTime).toMatch(/Apr 25, 2019 at 12:30\sPM/);
    } else {
      // Chrome, Firefox
      expect(env.dateTime).toMatch(/Apr 25, 2019, 12:30\sPM/);
    }
  });

  it('layout set correctly', () => {
    const template = '<app-owner #checkingOwner ownerRef="user01" [layoutStacked]="true"></app-owner>';
    const env = new TestEnvironment(template);
    expect(env.layout.classes['layout-stacked']).toBe(true);
    expect(env.layout.classes['layout-inline']).toBeUndefined();
    env.fixture.componentInstance.checkingOwner.layoutStacked = false;
    env.fixture.detectChanges();
    expect(env.layout.classes['layout-stacked']).toBeUndefined();
    expect(env.layout.classes['layout-inline']).toBe(true);
  });

  it('shows name as plain text when user cannot view user details', fakeAsync(() => {
    const template = '<app-owner ownerRef="user01"></app-owner>';
    const env = new TestEnvironment(template, []);
    tick();
    env.fixture.detectChanges();

    expect(env.nameButton).toBeNull();
    expect(env.nameDiv).not.toBeNull();
  }));

  it('shows name as clickable button when system admin can view user details', fakeAsync(() => {
    const template = '<app-owner ownerRef="user01"></app-owner>';
    const env = new TestEnvironment(template, [SystemRole.SystemAdmin]);
    tick();
    env.fixture.detectChanges();

    expect(env.nameButton).not.toBeNull();
    expect(env.nameDiv).toBeNull();
  }));

  it('opens user details dialog when system admin clicks the name', fakeAsync(() => {
    const template = '<app-owner ownerRef="user01"></app-owner>';
    const env = new TestEnvironment(template, [SystemRole.SystemAdmin]);
    tick();
    env.fixture.detectChanges();

    // SUT
    env.nameButton.nativeElement.click();
    tick();
    env.fixture.detectChanges();

    verify(mockedDialogService.openMatDialog(SaUserDetailsDialogComponent, anything())).once();
  }));

  it('opens user details dialog when serval admin clicks the name', fakeAsync(() => {
    const template = '<app-owner ownerRef="user01"></app-owner>';
    const env = new TestEnvironment(template, [SystemRole.ServalAdmin]);
    tick();
    env.fixture.detectChanges();

    // SUT
    env.nameButton.nativeElement.click();
    tick();
    env.fixture.detectChanges();

    verify(mockedDialogService.openMatDialog(SaUserDetailsDialogComponent, anything())).once();
  }));
});

@Component({
  selector: 'app-host',
  template: '',
  imports: [OwnerComponent]
})
class HostComponent {
  @ViewChild(OwnerComponent) checkingOwner!: OwnerComponent;
}

class TestEnvironment {
  readonly fixture: ComponentFixture<HostComponent>;

  readonly mockedTranslocoService = mock(TranslocoService);
  readonly mockedDialogRef = mock<MatDialogRef<SaUserDetailsDialogComponent>>(MatDialogRef);

  private readonly realtimeService: TestRealtimeService;

  constructor(template: string, currentUserRoles: SystemRole[] = []) {
    when(mockedAuthService.currentUserRoles).thenReturn(currentUserRoles);
    when(mockedDialogService.openMatDialog(anything(), anything())).thenReturn(instance(this.mockedDialogRef));

    TestBed.configureTestingModule({
      imports: [OwnerComponent, HostComponent],
      providers: [
        provideTestRealtime(SF_TYPE_REGISTRY),
        { provide: TranslocoService, useFactory: () => instance(this.mockedTranslocoService) },
        { provide: AuthService, useValue: instance(mockedAuthService) },
        { provide: DialogService, useValue: instance(mockedDialogService) },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });
    TestBed.overrideComponent(HostComponent, { set: { template: template } });

    this.realtimeService = TestBed.inject<TestRealtimeService>(TestRealtimeService);
    this.realtimeService.addSnapshot<UserProfile>(UserProfileDoc.COLLECTION, {
      id: 'user01',
      data: createTestUserProfile({ displayName: 'User 01' })
    });
    this.realtimeService.addSnapshot<User>(UserDoc.COLLECTION, {
      id: 'user01',
      data: createTestUser({ displayName: 'User 01', email: 'user01@example.com' }, 1)
    });
    when(this.mockedTranslocoService.translate<string>(anything())).thenCall(
      (translationStringKey: string) => translationStringKey
    );
    this.fixture = TestBed.createComponent(HostComponent);
    this.fixture.detectChanges();
  }

  get userName(): string {
    return this.fixture.debugElement.query(By.css('.layout .name')).nativeElement.textContent;
  }

  get dateTime(): string {
    return this.fixture.debugElement.query(By.css('.layout .date-time')).nativeElement.textContent;
  }

  get layout(): DebugElement {
    return this.fixture.debugElement.query(By.css('.layout'));
  }

  get avatar(): DebugElement {
    return this.fixture.debugElement.query(By.css('.avatar'));
  }

  get nameButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('button.name'));
  }

  get nameDiv(): DebugElement {
    return this.fixture.debugElement.query(By.css('div.name'));
  }
}
