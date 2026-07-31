// Repro: community checker is on the checking page; admin disables community checking; the
// checker then clicks a question and changes the chapter.
import { launch, newPage, login, rpc, shot, APP } from './lib.mjs';

const projectId = process.argv[2];
const tag = process.argv[3] ?? 'before';
const errors = [];

const browser = await launch();

const checker = await newPage(browser);
checker.on('pageerror', e => errors.push(e.message));
await login(checker, 'auth0|mock-unlinked', 'checker');
await checker.goto(`${APP}/projects/${projectId}/checking/RUT/1?scope=all`, { waitUntil: 'domcontentloaded' });
await checker.waitForTimeout(8000);
console.log('checker on:', checker.url());
await shot(checker, `/workspace/.agent-tmp/${tag}-1-checker-checking.png`);

const admin = await newPage(browser);
await login(admin, 'oauth2|paratext|mock-admin', 'admin');
const res = await rpc(admin, 'projects', 'updateSettings', { projectId, settings: { checkingEnabled: false } });
console.log('disable checking rpc:', JSON.stringify(res).slice(0, 200));

await checker.waitForTimeout(5000);
console.log('checker url after disable:', checker.url());
await shot(checker, `/workspace/.agent-tmp/${tag}-2-after-disable.png`);
errors.length = 0;

// Click the second question in the list (a question in another chapter)
const question = checker.locator('text=Question in chapter 2?').first();
if ((await question.count()) > 0) {
  await question.click({ timeout: 10000 }).catch(e => console.log('question click failed: ' + e.message));
  await checker.waitForTimeout(3000);
  console.log('after question click, url:', checker.url());
  console.log('errors after question click:', JSON.stringify(errors));
  await shot(checker, `/workspace/.agent-tmp/${tag}-3-after-question-click.png`);
} else {
  console.log('no question rows present to click');
}
errors.length = 0;

// Change the chapter via the chapter chooser
const chapterSelect = checker.locator('#chapter-select mat-select');
if ((await chapterSelect.count()) > 0) {
  await chapterSelect.click({ timeout: 10000 }).catch(e => console.log('chapter select click failed: ' + e.message));
  await checker.waitForTimeout(1500);
  const options = checker.locator('.chapter-select-menu mat-option');
  console.log('chapter options:', await options.count());
  if ((await options.count()) > 1) {
    await options
      .nth(1)
      .click({ timeout: 10000 })
      .catch(e => console.log('chapter option click failed: ' + e.message));
  }
  await checker.waitForTimeout(3000);
  console.log('after chapter change, url:', checker.url());
  console.log('errors after chapter change:', JSON.stringify(errors));
  await shot(checker, `/workspace/.agent-tmp/${tag}-4-after-chapter-change.png`);
} else {
  console.log('no chapter chooser present');
}

// restore for the next run
await rpc(admin, 'projects', 'updateSettings', { projectId, settings: { checkingEnabled: true } });
await browser.close();
