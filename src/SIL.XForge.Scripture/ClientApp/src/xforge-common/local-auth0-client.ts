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
import { environment } from '../environments/environment';

/** localStorage key for the pending auth state (set before the local login redirect). */
const LOCAL_AUTH_PENDING_STATE_KEY = 'local_auth_pending_state';

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
 * Redirects to the stub server's standalone HTML login page instead of Auth0, so the
 * login UI is served entirely by the stub rather than embedded in the Angular app.
 * Tokens are passed back from the stub as a URL fragment on the callback redirect.
 * Only used when environment.useLocalAuth is true.
 */
export class LocalAuth0Client implements IAuth0Client {
  getTokenSilently(options?: GetTokenSilentlyOptions): Promise<string | GetTokenSilentlyVerboseResponse> {
    const cached: LocalAuthCachedToken | null = this.getCachedToken();
    if (cached == null || this.isExpired(cached)) {
      // Remove expired token from localStorage to avoid repeated validation attempts
      if (cached != null) {
        localStorage.removeItem(LOCAL_AUTH_CACHED_TOKEN_KEY);
      }
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
    // Redirect to the stub server's standalone HTML login page.
    // The stub will issue tokens and redirect back to the callback URL with the token
    // embedded as a URL fragment (e.g. /callback/auth0#access_token=...&id_token=...).
    const callbackUrl: string = `${window.location.origin}/callback/auth0`;
    window.location.href = `${environment.localAuthServerUrl}/login?redirect_uri=${encodeURIComponent(callbackUrl)}`;
    return Promise.resolve();
  }

  handleRedirectCallback(): Promise<RedirectLoginResult | ConnectAccountRedirectResult> {
    const appState: string = localStorage.getItem(LOCAL_AUTH_PENDING_STATE_KEY) ?? '{}';
    localStorage.removeItem(LOCAL_AUTH_PENDING_STATE_KEY);

    // Read the token that the stub embedded in the URL fragment after login.
    // The fragment has the form #access_token=...&id_token=...&expires_in=...&token_type=Bearer
    const fragment: string = window.location.hash.slice(1); // strip leading '#'
    if (fragment !== '') {
      const params: URLSearchParams = new URLSearchParams(fragment);
      const accessToken: string | null = params.get('access_token');
      const idToken: string | null = params.get('id_token');
      const expiresInStr: string | null = params.get('expires_in');
      if (accessToken != null && idToken != null) {
        const tokenToCache: LocalAuthCachedToken = {
          access_token: accessToken,
          id_token: idToken,
          expires_in: expiresInStr != null ? parseInt(expiresInStr, 10) : 86400,
          stored_at: Date.now()
        };
        localStorage.setItem(LOCAL_AUTH_CACHED_TOKEN_KEY, JSON.stringify(tokenToCache));
      }
      // Clear the fragment from the browser history so the token is not visible in the URL bar
      history.replaceState(null, '', window.location.pathname + window.location.search);
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
      // Remove the corrupted data so subsequent calls don't keep failing to parse it
      localStorage.removeItem(LOCAL_AUTH_CACHED_TOKEN_KEY);
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

export { LOCAL_AUTH_CACHED_TOKEN_KEY };
