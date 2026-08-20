import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { anything, deepEqual, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LocationService } from './location.service';

const mockedAuthService = mock(AuthService);
const mockedLocationService = mock(LocationService);
const mockedActivatedRouteSnapshot = mock(ActivatedRouteSnapshot);
const mockedRouterStateSnapshot = mock(RouterStateSnapshot);

/** A window whose most recent navigation was of the specified type. */
function windowStub(navigationType: NavigationTimingType): Window {
  return {
    performance: { getEntriesByType: () => [{ type: navigationType } as PerformanceNavigationTiming] }
  } as unknown as Window;
}

describe('AuthGuard', () => {
  beforeEach(() => {
    resetCalls(mockedAuthService);
    resetCalls(mockedLocationService);
    when(mockedAuthService.loggedOutInThisTab).thenReturn(false);
  });

  it('should do nothing if already logged in', (done: DoneFn) => {
    // url test pattern: https://scriptureforge.org/projects/<projectId>
    const authGuard = new AuthGuard(
      instance(mockedAuthService),
      instance(mockedLocationService),
      windowStub('navigate')
    );
    expect(authGuard).toBeDefined();
    when(mockedAuthService.isLoggedIn).thenResolve(true);
    when(mockedActivatedRouteSnapshot.queryParams).thenReturn({});

    const canActivate$ = authGuard.canActivate(
      instance(mockedActivatedRouteSnapshot),
      instance(mockedRouterStateSnapshot)
    );

    canActivate$.subscribe(canActivate => {
      expect(canActivate).toBe(true);
      verify(mockedAuthService.logIn({ returnUrl: anything() })).never();
      done();
    });
  });

  it('should call logIn when not logged in', (done: DoneFn) => {
    // url test pattern: https://scriptureforge.org/projects/<projectId>
    const authGuard = new AuthGuard(
      instance(mockedAuthService),
      instance(mockedLocationService),
      windowStub('navigate')
    );
    expect(authGuard).toBeDefined();
    when(mockedAuthService.isLoggedIn).thenResolve(false);
    when(mockedActivatedRouteSnapshot.queryParams).thenReturn({});

    const canActivate$ = authGuard.canActivate(
      instance(mockedActivatedRouteSnapshot),
      instance(mockedRouterStateSnapshot)
    );

    canActivate$.subscribe(canActivate => {
      expect(canActivate).toBe(false);
      verify(mockedAuthService.logIn(anything())).once();
      done();
    });
  });

  it('should call logIn when not logged in and signing up', (done: DoneFn) => {
    // url test pattern: https://scriptureforge.org/projects/<projectId>?sign-up=true
    const authGuard = new AuthGuard(
      instance(mockedAuthService),
      instance(mockedLocationService),
      windowStub('navigate')
    );
    expect(authGuard).toBeDefined();
    when(mockedAuthService.isLoggedIn).thenResolve(false);
    when(mockedActivatedRouteSnapshot.queryParams).thenReturn({ sharing: '', 'sign-up': 'true' });

    const canActivate$ = authGuard.canActivate(
      instance(mockedActivatedRouteSnapshot),
      instance(mockedRouterStateSnapshot)
    );

    canActivate$.subscribe(canActivate => {
      expect(canActivate).toBe(false);
      verify(
        mockedAuthService.logIn(
          deepEqual({
            returnUrl: anything(),
            signUp: true,
            locale: undefined
          })
        )
      ).once();
      done();
    });
  });

  it('should call logIn when not logged in with locale', (done: DoneFn) => {
    // url test pattern: https://scriptureforge.org/projects/<projectId>?locale=es
    const authGuard = new AuthGuard(
      instance(mockedAuthService),
      instance(mockedLocationService),
      windowStub('navigate')
    );
    expect(authGuard).toBeDefined();
    when(mockedAuthService.isLoggedIn).thenResolve(false);
    const locale = 'es';
    when(mockedActivatedRouteSnapshot.queryParams).thenReturn({ locale });

    const canActivate$ = authGuard.canActivate(
      instance(mockedActivatedRouteSnapshot),
      instance(mockedRouterStateSnapshot)
    );

    canActivate$.subscribe(canActivate => {
      expect(canActivate).toBe(false);
      verify(mockedAuthService.logIn(deepEqual({ returnUrl: anything(), signUp: false, locale }))).once();
      done();
    });
  });

  it('should go to the home page, rather than log in, when going back to the page after logging out', (done: DoneFn) => {
    // The user logged out, and then clicked the browser's back button (SF-2736)
    const authGuard = new AuthGuard(
      instance(mockedAuthService),
      instance(mockedLocationService),
      windowStub('back_forward')
    );
    when(mockedAuthService.isLoggedIn).thenResolve(false);
    when(mockedAuthService.loggedOutInThisTab).thenReturn(true);
    when(mockedActivatedRouteSnapshot.queryParams).thenReturn({});

    const canActivate$ = authGuard.canActivate(
      instance(mockedActivatedRouteSnapshot),
      instance(mockedRouterStateSnapshot)
    );

    canActivate$.subscribe(canActivate => {
      expect(canActivate).toBe(false);
      verify(mockedLocationService.go('/')).once();
      verify(mockedAuthService.logIn(anything())).never();
      done();
    });
  });

  it('should call logIn when the page is opened, rather than gone back to, after logging out', (done: DoneFn) => {
    const authGuard = new AuthGuard(
      instance(mockedAuthService),
      instance(mockedLocationService),
      windowStub('navigate')
    );
    when(mockedAuthService.isLoggedIn).thenResolve(false);
    when(mockedAuthService.loggedOutInThisTab).thenReturn(true);
    when(mockedActivatedRouteSnapshot.queryParams).thenReturn({});

    const canActivate$ = authGuard.canActivate(
      instance(mockedActivatedRouteSnapshot),
      instance(mockedRouterStateSnapshot)
    );

    canActivate$.subscribe(canActivate => {
      expect(canActivate).toBe(false);
      verify(mockedAuthService.logIn(anything())).once();
      done();
    });
  });
});
