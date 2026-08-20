import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { from, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { WINDOW } from './browser-globals';
import { LocationService } from './location.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private readonly authService: AuthService,
    private readonly locationService: LocationService,
    @Inject(WINDOW) private readonly window: Window
  ) {}

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean> {
    return this.allowTransition().pipe(
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          // Logging out leaves the page the user logged out from in the browser history. Going back to it started a
          // new login, so the user was left looking at an empty app while Auth0 loaded, instead of ending up somewhere
          // that reflects having logged out (SF-2736). Send them to the logged out home page instead, from where they
          // can log in again if they want to.
          if (this.authService.loggedOutInThisTab && this.isHistoryNavigation) {
            this.locationService.go('/');
            return;
          }
          const signUp = route.queryParams['sign-up'] === 'true';
          const locale: string = route.queryParams['locale'];
          void this.authService.logIn({
            returnUrl: this.locationService.pathname + this.locationService.search,
            signUp,
            locale
          });
        }
      })
    );
  }

  allowTransition(): Observable<boolean> {
    return from(this.authService.isLoggedIn);
  }

  /** Whether this page was loaded by the user going back or forward in their browser history. */
  private get isHistoryNavigation(): boolean {
    const [navigation] = this.window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return navigation?.type === 'back_forward';
  }
}
