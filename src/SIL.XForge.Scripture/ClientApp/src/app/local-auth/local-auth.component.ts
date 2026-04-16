import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LOCAL_AUTH_TOKEN_KEY } from 'xforge-common/local-auth0-client';

interface DevUser {
  userId: string;
  name: string;
  email: string;
  roles: string[];
}

interface TokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
}

interface LocalAuthToken {
  access_token: string;
  id_token: string;
  expires_in: number;
  stored_at: number;
}

/**
 * Simple login page for local development mode.
 * Shows a list of pre-defined dev users and allows selecting one to log in as.
 * Only accessible when environment.useLocalAuth is true.
 *
 * After selecting a user, the component fetches a token from the local backend,
 * stores it in localStorage, and redirects to /callback/auth0 so that AuthService
 * can complete the login flow via LocalAuth0Client.handleRedirectCallback().
 */
@Component({
  selector: 'app-local-auth',
  templateUrl: './local-auth.component.html',
  styleUrls: ['./local-auth.component.scss'],
  standalone: true,
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatButton]
})
export class LocalAuthComponent implements OnInit {
  protected devUsers: DevUser[] = [];
  protected isLoading: boolean = false;
  protected errorMessage: string = '';

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!environment.useLocalAuth) {
      // This component should not be accessible in non-dev environments
      void this.router.navigateByUrl('/projects');
      return;
    }
    // Fetch the list of available dev users from the dev stub server
    this.http.get<DevUser[]>(`${environment.localAuthServerUrl}/dev-auth/users`).subscribe({
      next: users => (this.devUsers = users),
      error: () => {
        // Fall back to a default user if the endpoint is not available
        this.devUsers = [
          { userId: 'devUser01', name: 'Dev Admin', email: 'devadmin@localhost', roles: ['system_admin'] },
          { userId: 'devUser02', name: 'Dev User', email: 'devuser@localhost', roles: [] }
        ];
      }
    });
  }

  protected loginAs(userId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.post<TokenResponse>(`${environment.localAuthServerUrl}/dev-auth/token`, { userId }).subscribe({
      next: tokenResponse => {
        const tokenToStore: LocalAuthToken = {
          access_token: tokenResponse.access_token,
          id_token: tokenResponse.id_token,
          expires_in: tokenResponse.expires_in,
          stored_at: Date.now()
        };
        // Store the token temporarily; LocalAuth0Client.handleRedirectCallback() picks it up
        localStorage.setItem(LOCAL_AUTH_TOKEN_KEY, JSON.stringify(tokenToStore));
        // Use a full page navigation to mimic how Auth0 redirects back to the callback URL.
        // This causes the Angular app to reload so that AuthService.tryLogIn() runs fresh with
        // the callback URL, rather than resolving immediately from the already-emitted
        // _loggedInState$ value of { loggedIn: false } (which would redirect back to the login page).
        window.location.href = '/callback/auth0';
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage =
          'Failed to get token from local dev stub server. Is the stub running? (run: dotnet run --project src/dev-stubs)';
      }
    });
  }
}
