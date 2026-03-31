/// <reference lib="dom" />
import { Page } from 'npm:playwright';
import secrets from './secrets.json' with { type: 'json' };

// Default application URL for the local development server.
const DEFAULT_ROOT_URL = 'http://localhost:5000';

/** Returns true if the given URL is the application root (home page). */
function isRootUrl(url: string, rootUrl: string = DEFAULT_ROOT_URL): boolean {
  let a = url;
  let b = rootUrl;
  if (a.endsWith('/')) a = a.slice(0, -1);
  if (b.endsWith('/')) b = b.slice(0, -1);
  return a === b;
}

/**
 * Switches the home page locale selector to the given locale code.
 * Must be called while on the application root URL.
 */
async function switchToLocaleOnHomePage(page: Page, localeCode: string): Promise<void> {
  await page.getByRole('combobox').selectOption(localeCode);
  await page.waitForTimeout(50); // Wait for the page to reload
}

/**
 * Sets an input element's value directly via DOM, bypassing user-input detection.
 * Used to supply credentials without triggering Google account detection on the email field.
 */
async function setLocatorToValue(page: Page, locator: string, value: string): Promise<void> {
  return await page.evaluate(
    ({ locator, value }) => {
      const element = document.querySelector(locator);
      if (element == null) throw new Error(`Element not found for locator: ${locator}`);
      if (!(element instanceof HTMLInputElement)) throw new Error(`Element is not an input: ${locator}`);
      element.value = value;
    },
    { locator, value }
  );
}

/**
 * Logs out the currently signed-in user and waits for a redirect to the application root URL.
 * @param page The Playwright page object.
 * @param rootUrl The application root URL. Defaults to http://localhost:5000.
 */
export async function logOut(page: Page, rootUrl: string = DEFAULT_ROOT_URL): Promise<void> {
  await page.getByRole('button', { name: 'User' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  if (await page.getByRole('button', { name: 'Yes, log out' }).isVisible()) {
    await page.getByRole('button', { name: 'Yes, log out' }).click();
  }
  await page.waitForURL(rootUrl);
}

/**
 * Logs in to Scripture Forge as the given Paratext user, handling Auth0 and Paratext
 * Registry authentication flows. Retries up to 3 times if the login fails.
 * @param page The Playwright page object.
 * @param user The user credentials (email and password).
 * @param rootUrl The application root URL. Defaults to http://localhost:5000.
 */
export async function logInAsPTUser(
  page: Page,
  user: { email: string; password: string },
  rootUrl: string = DEFAULT_ROOT_URL
): Promise<void> {
  await page.goto(rootUrl);
  if (!isRootUrl(page.url(), rootUrl)) await logOut(page, rootUrl);

  await switchToLocaleOnHomePage(page, 'en');
  await page.getByRole('link', { name: 'Log In' }).click();

  let tries = 0;
  let loginSuccessful = false;
  while (!loginSuccessful && tries < 3) {
    await page.locator('a').filter({ hasText: 'Log in with Paratext' }).click();

    // Paratext Registry login

    // Type fake username so it won't detect a Google account
    await page.fill('input[name="email"]', 'user@example.com');
    // Click the next arrow button
    await page.locator('#password-group').getByRole('button').click();
    await page.fill('input[name="password"]', user.password);
    // Change the value of email without triggering user input detection
    await setLocatorToValue(page, 'input[name="email"]', user.email);
    await page.locator('#password-group').getByRole('button').click();

    // The first login requires authorizing Scripture Forge to access the Paratext account
    if ((await page.title()).startsWith('Authorise Application')) {
      await page.getByRole('button', { name: 'Accept' }).click();
    }

    // On localhost only, Auth0 requires accepting access to the account.
    // Wait until back in the app, or on the authorization page.
    const auth0AuthorizeUrl = 'https://sil-appbuilder.auth0.com/decision';
    await page.waitForURL(url =>
      [auth0AuthorizeUrl, rootUrl].some(startingUrl => url.href.startsWith(startingUrl))
    );

    if (page.url().startsWith(auth0AuthorizeUrl)) {
      await page.locator('#allow').click();
    }

    try {
      await page.waitForURL(url => /^\/projects/.test(url.pathname));
      loginSuccessful = true;
    } catch (e) {
      if (e instanceof Error && e.message.includes('Timeout')) {
        // FIXME(application-bug) Sometimes a login failure occurs. Retry.
        if (await page.getByRole('button', { name: 'Try Again' }).isVisible()) {
          await page.getByRole('button', { name: 'Try Again' }).click();
          await page.waitForURL(url => /^\/projects/.test(url.pathname));
        }
        loginSuccessful = false;
        tries++;
      } else {
        throw e;
      }
    }
  }
}

/**
 * Extracts the role segment from a test-user email address of the form
 * `user+<role>@example.com`. Returns undefined if the email does not follow
 * this convention.
 */
function extractUserRoleFromEmail(email: string): string | undefined {
  return email.split('@')[0].split('+')[1];
}

/** Returns the site admin credentials from secrets.json. */
function siteAdminCredentials(): { email: string; password: string } {
  const adminCredentials = secrets.users.find(user => extractUserRoleFromEmail(user.email) === 'sf_e2e_admin');
  if (adminCredentials == null) throw new Error('Admin credentials not found in secrets.json');
  return adminCredentials;
}

/**
 * Logs in to Scripture Forge as the site admin user.
 * @param page The Playwright page object.
 * @param rootUrl The application root URL. Defaults to http://localhost:5000.
 */
export async function logInAsSiteAdmin(page: Page, rootUrl: string = DEFAULT_ROOT_URL): Promise<void> {
  await logInAsPTUser(page, siteAdminCredentials(), rootUrl);
}
