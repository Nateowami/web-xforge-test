// Repro variant: only change the chapter after community checking is disabled.
import { launch, newPage, login, rpc, shot, APP } from './lib.mjs';

const projectId = process.argv[2];
const tag = process.argv[3] ?? 'chapter';
const browser = await launch();

const checker = await newPage(browser);
await login(checker, 'auth0|mock-unlinked', 'checker');
await checker.goto(`${APP}/projects/${projectId}/checking/RUT/1?scope=all`, { waitUntil: 'domcontentloaded' });
await checker.waitForTimeout(8000);

const admin = await newPage(browser);
await login(admin, 'oauth2|paratext|mock-admin', 'admin');
await rpc(admin, 'projects', 'updateSettings', { projectId, settings: { checkingEnabled: false } });
await checker.waitForTimeout(5000);
console.log('checker url after disable:', checker.url());

const chapterSelect = checker.locator('#chapter-select mat-select');
console.log('chapter select present:', await chapterSelect.count());
if ((await chapterSelect.count()) > 0) {
  await chapterSelect.click({ timeout: 8000, force: true }).catch(e => console.log('select click: ' + e.message));
  await checker.waitForTimeout(1500);
  const options = checker.locator('.chapter-select-menu mat-option');
  console.log('chapter options:', await options.count());
  if ((await options.count()) > 1) {
    await options
      .nth(1)
      .click({ timeout: 8000 })
      .catch(e => console.log('option click: ' + e.message));
  }
  await checker.waitForTimeout(3000);
  console.log('url after chapter change:', checker.url());
  await shot(checker, `/workspace/.agent-tmp/${tag}-after-chapter-change.png`);
}

await rpc(admin, 'projects', 'updateSettings', { projectId, settings: { checkingEnabled: true } });
await browser.close();
