import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { of } from 'rxjs';
import { anything, capture, mock, verify, when } from 'ts-mockito';
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

  it('should clear filters belonging to other tabs when switching tabs', () => {
    const env = new TestEnvironment();

    env.component.onTabChange(0);
    // The Serval Builds search and the Draft Jobs project filter do not apply to the Projects tab.
    expect(env.lastNavigatedQueryParams).toEqual({ tab: 'projects', projectId: null, q: null });

    env.component.onTabChange(3);
    expect(env.lastNavigatedQueryParams).toEqual({ tab: 'onboarding-requests', projectId: null, q: null });
  });

  it('should keep the filter belonging to the tab being switched to', () => {
    const env = new TestEnvironment();

    env.component.onTabChange(1);
    expect(env.lastNavigatedQueryParams).toEqual({ tab: 'draft-jobs', q: null });

    env.component.onTabChange(2);
    expect(env.lastNavigatedQueryParams).toEqual({ tab: 'serval-builds', projectId: null });
  });

  class TestEnvironment {
    readonly component: ServalAdministrationComponent;
    readonly fixture: ComponentFixture<ServalAdministrationComponent>;

    constructor() {
      // The mocks are reset after each test, so stub within the test.
      when(mockedActivatedRoute.queryParams).thenReturn(of({}));
      this.fixture = TestBed.createComponent(ServalAdministrationComponent);
      this.component = this.fixture.componentInstance;
      this.fixture.detectChanges();
    }

    get lastNavigatedQueryParams(): Params | null | undefined {
      verify(mockedRouter.navigate(anything(), anything())).atLeast(1);
      return capture(mockedRouter.navigate).last()[1]?.queryParams;
    }
  }
});
