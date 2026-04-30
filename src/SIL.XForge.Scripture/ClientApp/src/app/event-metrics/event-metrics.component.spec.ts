import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { mock } from 'ts-mockito';
import { ActivatedProjectService } from 'xforge-common/activated-project.service';
import { AuthService } from 'xforge-common/auth.service';
import { DialogService } from 'xforge-common/dialog.service';
import { NoticeService } from 'xforge-common/notice.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectService } from '../core/sf-project.service';
import { EventMetricsComponent } from './event-metrics.component';

describe('EventMetricsComponent', () => {
  configureTestingModule(() => ({
    imports: [getTestTranslocoModule()],
    providers: [
      provideNoopAnimations(),
      provideTestOnlineStatus(),
      { provide: AuthService, useMock: mock(AuthService) },
      { provide: ActivatedProjectService, useMock: mock(ActivatedProjectService) },
      { provide: DialogService, useMock: mock(DialogService) },
      { provide: OnlineStatusService, useClass: TestOnlineStatusService },
      { provide: SFProjectService, useMock: mock(SFProjectService) },
      { provide: UserService, useMock: mock(UserService) },
      { provide: NoticeService, useMock: mock(NoticeService) }
    ]
  }));

  it('should be created', () => {
    const env = new TestEnvironment();
    expect(env.component).toBeTruthy();
  });

  class TestEnvironment {
    readonly component: EventMetricsComponent;
    readonly fixture: ComponentFixture<EventMetricsComponent>;

    constructor() {
      this.fixture = TestBed.createComponent(EventMetricsComponent);
      this.component = this.fixture.componentInstance;
      this.fixture.detectChanges();
    }
  }
});
