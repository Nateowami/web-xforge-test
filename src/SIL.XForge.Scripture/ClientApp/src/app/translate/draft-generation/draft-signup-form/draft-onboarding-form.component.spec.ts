import { DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { createTestProject } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { of } from 'rxjs';
import { anything, mock, verify, when } from 'ts-mockito';
import { ActivatedProjectService } from 'xforge-common/activated-project.service';
import { DialogService } from 'xforge-common/dialog.service';
import { I18nService } from 'xforge-common/i18n.service';
import { NoticeService } from 'xforge-common/notice.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../../../core/models/sf-project-profile-doc';
import { ParatextService } from '../../../core/paratext.service';
import { ProgressService } from '../../../shared/progress-service/progress.service';
import { OnboardingRequestService } from '../onboarding-request.service';
import { DraftOnboardingFormComponent } from './draft-onboarding-form.component';

const mockedActivatedProjectService = mock(ActivatedProjectService);
const mockedUserService = mock(UserService);
const mockedParatextService = mock(ParatextService);
const mockedOnboardingRequestService = mock(OnboardingRequestService);
const mockedNoticeService = mock(NoticeService);
const mockedDialogService = mock(DialogService);
const mockedI18nService = mock(I18nService);
const mockedProgressService = mock(ProgressService);

describe('DraftOnboardingFormComponent', () => {
  configureTestingModule(() => ({
    imports: [getTestTranslocoModule()],
    providers: [
      provideRouter([{ path: 'projects/:projectId/draft-generation', children: [] }]),
      provideTestOnlineStatus(),
      { provide: OnlineStatusService, useClass: TestOnlineStatusService },
      { provide: ActivatedProjectService, useMock: mockedActivatedProjectService },
      { provide: UserService, useMock: mockedUserService },
      { provide: ParatextService, useMock: mockedParatextService },
      { provide: OnboardingRequestService, useMock: mockedOnboardingRequestService },
      { provide: NoticeService, useMock: mockedNoticeService },
      { provide: DialogService, useMock: mockedDialogService },
      { provide: I18nService, useMock: mockedI18nService },
      { provide: ProgressService, useMock: mockedProgressService }
    ]
  }));

  it('shows an offline message and disables submitting while offline', fakeAsync(() => {
    const env = new TestEnvironment({ online: false });

    expect(env.offlineMessage).not.toBeNull();
    expect(env.submitButton.nativeElement.disabled).toBe(true);

    env.component.onSubmit();
    flush();

    verify(mockedOnboardingRequestService.getOpenOnboardingRequest(anything())).never();
    verify(mockedOnboardingRequestService.submitOnboardingRequest(anything(), anything())).never();
    verify(mockedNoticeService.showError(anything())).never();
  }));

  it('allows submitting once the app comes back online', fakeAsync(() => {
    const env = new TestEnvironment({ online: false });
    expect(env.offlineMessage).not.toBeNull();

    env.setOnline(true);

    expect(env.offlineMessage).toBeNull();
    expect(env.submitButton.nativeElement.disabled).toBe(false);
    // The already-submitted check skipped while offline runs on reconnecting
    verify(mockedOnboardingRequestService.getOpenOnboardingRequest('project01')).once();
    verify(mockedDialogService.message(anything(), anything(), anything())).never();

    // Later reconnects do not repeat the check
    env.setOnline(false);
    env.setOnline(true);
    verify(mockedOnboardingRequestService.getOpenOnboardingRequest('project01')).once();
  }));

  it('warns on reconnecting if a request was already submitted while the form was opened offline', fakeAsync(() => {
    const env = new TestEnvironment({ online: false });
    when(mockedOnboardingRequestService.getOpenOnboardingRequest('project01')).thenResolve({} as any);

    env.setOnline(true);

    verify(mockedOnboardingRequestService.getOpenOnboardingRequest('project01')).once();
    verify(mockedDialogService.message('draft_sources.request_already_submitted', undefined, anything())).once();
    expect(TestBed.inject(Router).url).toEqual('/projects/project01/draft-generation');
  }));

  it('hides the offline message when online', fakeAsync(() => {
    const env = new TestEnvironment({ online: true });

    expect(env.offlineMessage).toBeNull();
    expect(env.submitButton.nativeElement.disabled).toBe(false);
    verify(mockedOnboardingRequestService.getOpenOnboardingRequest('project01')).once();
  }));
});

class TestEnvironment {
  readonly component: DraftOnboardingFormComponent;
  readonly fixture: ComponentFixture<DraftOnboardingFormComponent>;
  private readonly testOnlineStatusService: TestOnlineStatusService;

  constructor({ online }: { online: boolean }) {
    this.testOnlineStatusService = TestBed.inject(OnlineStatusService) as TestOnlineStatusService;
    this.testOnlineStatusService.setIsOnline(online);

    const projectDoc = { id: 'project01', data: createTestProject() } as unknown as SFProjectProfileDoc;
    when(mockedActivatedProjectService.projectId).thenReturn('project01');
    when(mockedActivatedProjectService.projectId$).thenReturn(of('project01'));
    when(mockedActivatedProjectService.projectDoc).thenReturn(projectDoc);
    when(mockedUserService.getCurrentUser()).thenResolve({ data: undefined } as any);
    when(mockedParatextService.getProjects()).thenResolve([]);
    when(mockedParatextService.getResources()).thenResolve([]);
    when(mockedOnboardingRequestService.getOpenOnboardingRequest(anything())).thenResolve(null);
    when(mockedDialogService.message(anything(), anything(), anything())).thenResolve();
    when(mockedProgressService.getProgress(anything(), anything())).thenReturn(new Promise(() => {}));

    this.fixture = TestBed.createComponent(DraftOnboardingFormComponent);
    this.component = this.fixture.componentInstance;
    this.fixture.detectChanges();
    tick();
    this.fixture.detectChanges();
  }

  get offlineMessage(): DebugElement | null {
    return this.fixture.debugElement.query(By.css('#offline-message'));
  }

  get submitButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('button[type="submit"]'));
  }

  setOnline(online: boolean): void {
    this.testOnlineStatusService.setIsOnline(online);
    tick();
    this.fixture.detectChanges();
  }
}
