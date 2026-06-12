import { Page } from 'npm:playwright';
import { CHECKING_PROJECT_NAME, DEFAULT_PROJECT_SHORTNAME, preset, ScreenshotContext } from '../e2e-globals.ts';
import {
  ensureJoinedOrConnectedToProject,
  ensureOnMyProjectsPage,
  logInAsPTUser,
  waitForAppLoad,
  waitForNavigationToProjectPage
} from '../e2e-utils.ts';

/** Records the measured load time of a page or navigation step for performance tracking over time. */
interface PageLoadTiming {
  pageName: string;
  durationMs: number;
}

/** Logs a formatted summary of all recorded page load timings to the console. */
function logTimings(timings: PageLoadTiming[]): void {
  console.log('\n=== Performance Load Timings ===');
  for (const timing of timings) {
    console.log(`  ${timing.pageName}: ${timing.durationMs}ms`);
  }
  console.log('================================\n');
}

/**
 * Measures and logs page load times for key pages in the application. This test is intended to be run with a network
 * throttling preset (e.g. `slow_network`) after a production build to give realistic performance measurements. The
 * timings are logged to the console and can be used to track performance over time.
 */
export async function measureLoadTimes(
  page: Page,
  _context: ScreenshotContext,
  credentials: { email: string; password: string }
): Promise<void> {
  const timings: PageLoadTiming[] = [];

  // Measure the initial home page load time, which includes downloading the application bundle.
  let start = Date.now();
  await page.goto(preset.rootUrl);
  await page.waitForLoadState('domcontentloaded');
  timings.push({ pageName: 'home_page_initial_load', durationMs: Date.now() - start });
  console.log(`Home page loaded in ${timings.at(-1)!.durationMs}ms`);

  // Measure how long login and the initial navigation to the projects list takes.
  start = Date.now();
  await logInAsPTUser(page, credentials);
  await page.waitForURL(/\/projects/);
  await waitForAppLoad(page);
  timings.push({ pageName: 'login_and_my_projects', durationMs: Date.now() - start });
  console.log(`Login + my projects page loaded in ${timings.at(-1)!.durationMs}ms`);

  // Ensure the project is connected so we can navigate to it.
  await ensureJoinedOrConnectedToProject(page, DEFAULT_PROJECT_SHORTNAME);

  // Navigate back to the projects list to measure navigation to the project page from there.
  await ensureOnMyProjectsPage(page);
  start = Date.now();
  await page.getByRole('button', { name: DEFAULT_PROJECT_SHORTNAME }).click();
  await waitForNavigationToProjectPage(page);
  await waitForAppLoad(page);
  timings.push({ pageName: 'project_page', durationMs: Date.now() - start });
  console.log(`Project page loaded in ${timings.at(-1)!.durationMs}ms`);

  // Navigate to the community checking project if it's different from the default project.
  if (CHECKING_PROJECT_NAME !== DEFAULT_PROJECT_SHORTNAME) {
    await ensureJoinedOrConnectedToProject(page, CHECKING_PROJECT_NAME);
    await ensureOnMyProjectsPage(page);
    start = Date.now();
    await page.getByRole('button', { name: CHECKING_PROJECT_NAME }).click();
    await waitForNavigationToProjectPage(page);
    await waitForAppLoad(page);
    timings.push({ pageName: 'checking_project_page', durationMs: Date.now() - start });
    console.log(`Community checking project page loaded in ${timings.at(-1)!.durationMs}ms`);
  }

  logTimings(timings);
}
