import {
  ConnectAccountRedirectResult,
  GetTokenSilentlyOptions,
  GetTokenSilentlyVerboseResponse,
  IdToken,
  LogoutOptions,
  RedirectLoginOptions,
  RedirectLoginResult
} from '@auth0/auth0-spa-js';
import jwtDecode from 'jwt-decode';
import { Router } from '@angular/router';

/** localStorage key for the pending auth state (set before the local login redirect). */
const LOCAL_AUTH_PENDING_STATE_KEY = 'local_auth_pending_state';

/** localStorage key for the token returned by the local dev login page. */
const LOCAL_AUTH_TOKEN_KEY = 'local_auth_token';

/** localStorage key for the cached token used across browser refreshes. */
const LOCAL_AUTH_CACHED_TOKEN_KEY = 'local_auth_cached_token';

/** Shape of the token object stored in localStorage. */
interface LocalAuthCachedToken {
  access_token: string;
  id_token: string;
  /** Token lifetime in seconds at the time of issue. */
  expires_in: number;
  /** Unix timestamp (ms) when the token was stored. */
  stored_at: number;
}

/**
 * Interface describing the subset of Auth0Client methods used by AuthService.
 * Both the real Auth0Client and LocalAuth0Client implement this interface, so that
 * the frontend can work with either without modification.
 */
export interface IAuth0Client {
  getTokenSilently(options?: GetTokenSilentlyOptions): Promise<string | GetTokenSilentlyVerboseResponse>;
  getIdTokenClaims(): Promise<IdToken | undefined>;
  loginWithRedirect(options?: RedirectLoginOptions): Promise<void>;
  handleRedirectCallback(): Promise<RedirectLoginResult | ConnectAccountRedirectResult>;
  logout(options?: LogoutOptions): Promise<void>;
  checkSession(options?: GetTokenSilentlyOptions): Promise<void>;
}

/**
 * Local development replacement for Auth0Client.
 * Stores tokens in localStorage and communicates with the backend's
 * local dev auth endpoint (/dev-auth/token) instead of Auth0.
 * Only used when environment.useLocalAuth is true.
 */
export class LocalAuth0Client implements IAuth0Client {
  constructor(private readonly router: Router) {}

  getTokenSilently(options?: GetTokenSilentlyOptions): Promise<string | GetTokenSilentlyVerboseResponse> {
    const cached: LocalAuthCachedToken | null = this.getCachedToken();
    if (cached == null || this.isExpired(cached)) {
      return Promise.reject({ error: 'login_required' });
    }
    if ((options as any)?.detailedResponse) {
      const response: GetTokenSilentlyVerboseResponse = {
        access_token: cached.access_token,
        id_token: cached.id_token,
        expires_in: this.remainingSeconds(cached),
        token_type: 'Bearer',
        scope: 'openid profile email sf_data offline_access'
      };
      return Promise.resolve(response);
    }
    return Promise.resolve(cached.access_token);
  }

  getIdTokenClaims(): Promise<IdToken | undefined> {
    const cached: LocalAuthCachedToken | null = this.getCachedToken();
    if (cached == null) {
      return Promise.resolve(undefined);
    }
    try {
      const claims: any = jwtDecode(cached.id_token);
      return Promise.resolve({ ...claims, __raw: cached.id_token } as IdToken);
    } catch {
      return Promise.resolve(undefined);
    }
  }

  loginWithRedirect(options?: RedirectLoginOptions): Promise<void> {
    // Save the app state so handleRedirectCallback can restore it after login
    localStorage.setItem(LOCAL_AUTH_PENDING_STATE_KEY, options?.appState ?? '{}');
    this.router.navigateByUrl('/local-auth/login');
    return Promise.resolve();
  }

  handleRedirectCallback(): Promise<RedirectLoginResult | ConnectAccountRedirectResult> {
    const appState: string = localStorage.getItem(LOCAL_AUTH_PENDING_STATE_KEY) ?? '{}';
    const tokenJson: string | null = localStorage.getItem(LOCAL_AUTH_TOKEN_KEY);
    localStorage.removeItem(LOCAL_AUTH_PENDING_STATE_KEY);
    localStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);

    if (tokenJson != null) {
      // Persist the token for subsequent getTokenSilently calls and browser refreshes
      localStorage.setItem(LOCAL_AUTH_CACHED_TOKEN_KEY, tokenJson);
    }

    return Promise.resolve({ appState } as RedirectLoginResult);
  }

  logout(options?: LogoutOptions): Promise<void> {
    localStorage.removeItem(LOCAL_AUTH_CACHED_TOKEN_KEY);
    const returnTo: string = (options?.logoutParams as any)?.returnTo ?? '/';
    // Use a full page navigation so the app reloads cleanly after logout
    window.location.href = returnTo;
    return Promise.resolve();
  }

  /** No-op in local dev mode. Token renewal is handled by re-login when tokens expire. */
  checkSession(_options?: GetTokenSilentlyOptions): Promise<void> {
    return Promise.resolve();
  }

  private getCachedToken(): LocalAuthCachedToken | null {
    const tokenJson: string | null = localStorage.getItem(LOCAL_AUTH_CACHED_TOKEN_KEY);
    if (tokenJson == null) {
      return null;
    }
    try {
      return JSON.parse(tokenJson) as LocalAuthCachedToken;
    } catch {
      return null;
    }
  }

  private isExpired(cached: LocalAuthCachedToken): boolean {
    const expiresAtMs: number = cached.stored_at + cached.expires_in * 1000;
    return Date.now() >= expiresAtMs;
  }

  private remainingSeconds(cached: LocalAuthCachedToken): number {
    const expiresAtMs: number = cached.stored_at + cached.expires_in * 1000;
    return Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  }
}

export { LOCAL_AUTH_TOKEN_KEY, LOCAL_AUTH_CACHED_TOKEN_KEY };
