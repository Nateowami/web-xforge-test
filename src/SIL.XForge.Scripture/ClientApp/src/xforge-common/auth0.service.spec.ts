import { HttpClient } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth0ClientOptions, GenericError, GetTokenSilentlyVerboseResponse } from '@auth0/auth0-spa-js';
import { CookieService } from 'ngx-cookie-service';
import { of } from 'rxjs';
import { anything, capture, deepEqual, mock, resetCalls, verify, when } from 'ts-mockito';
import { Auth0Service, TransparentAuthenticationCookie } from 'xforge-common/auth0.service';
import { ErrorReportingService } from 'xforge-common/error-reporting.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { environment } from '../environments/environment';

const mockedHttpClient = mock(HttpClient);
const mockedCookieService = mock(CookieService);
const mockedReportingService = mock(ErrorReportingService);
const mockedRouter = mock(Router);

describe('Auth0Service', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: HttpClient, useMock: mockedHttpClient },
      { provide: CookieService, useMock: mockedCookieService },
      { provide: ErrorReportingService, useMock: mockedReportingService },
      { provide: Router, useMock: mockedRouter }
    ]
  }));

  it('should init a new Auth0 Client', fakeAsync(() => {
    const env = new TestEnvironment();
    const options: Auth0ClientOptions = {
      clientId: '12345',
      domain: 'localhost:5000'
    };

    const client = env.service.init(options);
    expect(client).toBeDefined();
    tick();
  }));

  it('should generate a new change password request when not using local auth', fakeAsync(() => {
    const env = new TestEnvironment();
    const email = 'test@example.com';
    // Temporarily disable local auth so the real Auth0 code path is exercised
    const savedUseLocalAuth: boolean = environment.useLocalAuth;
    (environment as any).useLocalAuth = false;
    env.service.changePassword(email);
    (environment as any).useLocalAuth = savedUseLocalAuth;
    const httpOptions = capture(mockedHttpClient.post).last();
    expect(httpOptions[0].includes('dbconnections/change_password')).toBe(true);
    expect(httpOptions[1]).toEqual({
      client_id: environment.authClientId,
      connection: 'Username-Password-Authentication',
      email
    });
  }));

  it('should return a message when changing password in local auth mode', fakeAsync(() => {
    const env = new TestEnvironment();
    let result: string | undefined;
    env.service.changePassword('test@example.com').then(r => (result = r));
    tick();
    expect(result).toBeDefined();
    expect(result).toContain('not supported in local development');
  }));

  it('should authenticate transparently with a cookie', fakeAsync(() => {
    const env = new TestEnvironment();
    env.setupAuthenticationCookie();
    const expectedResponse: GetTokenSilentlyVerboseResponse = {
      id_token: '',
      access_token: '',
      scope: '',
      expires_in: 0,
      token_type: 'Bearer'
    };
    when(
      mockedHttpClient.post(
        anything(),
        anything(),
        deepEqual({
          headers: { 'Content-Type': 'application/json' },
          responseType: 'text'
        })
      )
    ).thenReturn(of(JSON.stringify(expectedResponse)));
    env.service.tryTransparentAuthentication().then(response => {
      expect(response).toEqual(expectedResponse);
      verify(mockedReportingService.silentError(anything(), anything())).never();
    });
    tick();
  }));

  it('should not try and authenticate transparently if no cookie is set', fakeAsync(() => {
    const env = new TestEnvironment();
    env.service.tryTransparentAuthentication().then(response => {
      verify(mockedCookieService.check(TransparentAuthenticationCookie)).once();
      verify(mockedCookieService.get(TransparentAuthenticationCookie)).never();
      expect(response).toBeUndefined();
      resetCalls(mockedCookieService);
    });
    tick();
  }));

  it('should silently return when authentication fails', fakeAsync(() => {
    const env = new TestEnvironment();
    env.setupAuthenticationCookie();
    when(mockedHttpClient.post(anything(), anything(), anything())).thenThrow(
      new GenericError('login_required', 'Not logged in')
    );
    env.service.tryTransparentAuthentication().then(response => {
      verify(mockedCookieService.check(TransparentAuthenticationCookie)).once();
      verify(mockedCookieService.get(TransparentAuthenticationCookie)).once();
      verify(mockedReportingService.silentError(anything(), anything())).once();
      expect(response).toBeUndefined();
    });
    tick();
  }));
});

class TestEnvironment {
  readonly service: Auth0Service;

  constructor() {
    when(mockedHttpClient.post(anything(), anything(), anything())).thenReturn(of({} as any));
    this.service = TestBed.inject(Auth0Service);
  }

  setupAuthenticationCookie(): void {
    when(mockedCookieService.check(TransparentAuthenticationCookie)).thenReturn(true);
    when(mockedCookieService.get(TransparentAuthenticationCookie)).thenReturn(
      JSON.stringify({
        Username: 'user01',
        Password: 'pass'
      })
    );
  }
}
