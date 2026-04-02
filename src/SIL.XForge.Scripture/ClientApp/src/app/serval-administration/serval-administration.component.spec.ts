import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { anything, mock, verify, when } from 'ts-mockito';
import { provideTestRealtime } from 'xforge-common/test-realtime-providers';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { SF_TYPE_REGISTRY } from '../core/models/sf-type-registry';
import { ServalAdministrationComponent } from './serval-administration.component';

const mockedActivatedRoute = mock(ActivatedRoute);
const mockedRouter = mock(Router);

describe('ServalAdministrationComponent', () => {
  configureTestingModule(() => ({
    imports: [getTestTranslocoModule()],
    providers: [
      provideTestRealtime(SF_TYPE_REGISTRY),
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useMock: mockedActivatedRoute },
      { provide: Router, useMock: mockedRouter }
    ]
  }));

  it('should be created', () => {
    const env = new TestEnvironment();
    expect(env.component).toBeTruthy();
  });

  it('should default to the projects tab when no query param is present', () => {
    const env = new TestEnvironment();
    expect(env.component.selectedTabIndex).toBe(0);
  });

  it('should select the draft-jobs tab based on query param', () => {
    const env = new TestEnvironment({ tab: 'draft-jobs' });
    expect(env.component.selectedTabIndex).toBe(1);
  });

  it('should select the draft-requests tab based on query param', () => {
    const env = new TestEnvironment({ tab: 'draft-requests' });
    expect(env.component.selectedTabIndex).toBe(2);
  });

  it('should default to the projects tab for an unknown query param value', () => {
    const env = new TestEnvironment({ tab: 'unknown-tab' });
    expect(env.component.selectedTabIndex).toBe(0);
  });

  it('should update the URL with the correct tab query param when a tab is changed', () => {
    const env = new TestEnvironment();
    when(mockedRouter.navigate(anything(), anything())).thenResolve(true);

    // SUT
    env.component.onTabChange(2);

    verify(mockedRouter.navigate([], anything())).once();
    expect(env.component.selectedTabIndex).toBe(2);
  });

  class TestEnvironment {
    readonly component: ServalAdministrationComponent;
    readonly fixture: ComponentFixture<ServalAdministrationComponent>;

    private readonly queryParams$: BehaviorSubject<Params>;

    constructor({ tab }: { tab?: string } = {}) {
      this.queryParams$ = new BehaviorSubject<Params>(tab != null ? { tab } : {});
      when(mockedActivatedRoute.queryParams).thenReturn(this.queryParams$);

      this.fixture = TestBed.createComponent(ServalAdministrationComponent);
      this.component = this.fixture.componentInstance;
      this.fixture.detectChanges();
    }
  }
});
