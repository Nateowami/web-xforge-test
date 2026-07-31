// Scenario setup: as admin, add two questions (RUT 1 and RUT 2) and mint a community-checker
// share link; then join as the unlinked mock user so they become sf_community_checker.
import { launch, newPage, login, rpc, shot, APP } from './lib.mjs';

const projectId = process.argv[2];
if (projectId == null) throw new Error('usage: setup.mjs <sfProjectId>');

const browser = await launch();

// --- admin ---
const admin = await newPage(browser);
await login(admin, 'oauth2|paratext|mock-admin', 'admin');
console.log('admin logged in');

await admin.goto(`${APP}/projects/${projectId}/checking`, { waitUntil: 'domcontentloaded' });
await admin.waitForTimeout(5000);
await shot(admin, '/workspace/.agent-tmp/admin-overview.png');

async function addQuestion(ref, text) {
  await admin.locator('.add-question-button').first().click();
  await admin.waitForTimeout(1500);
  await admin.locator('#scripture-start input').fill(ref);
  await admin.locator('app-text-and-audio textarea, textarea').first().fill(text);
  await admin.locator('#question-save-btn').click();
  await admin.waitForTimeout(3000);
  console.log(`question added: ${ref}`);
}

await addQuestion('RUT 1:1', 'Question in chapter 1?');
await addQuestion('RUT 2:1', 'Question in chapter 2?');
await shot(admin, '/workspace/.agent-tmp/admin-overview-questions.png');

const result = await rpc(admin, 'projects', 'linkSharingKey', {
  projectId,
  role: 'sf_community_checker',
  shareLinkType: 'anyone',
  daysBeforeExpiration: 14
});
console.log('linkSharingKey:', JSON.stringify(result).slice(0, 200));
const shareKey = result.result;

// --- community checker joins ---
const checker = await newPage(browser);
await login(checker, 'auth0|mock-unlinked', 'checker');
console.log('checker logged in');
await checker.goto(`${APP}/join/${shareKey}`, { waitUntil: 'domcontentloaded' });
await checker.waitForTimeout(8000);
console.log('checker url after join:', checker.url());
await shot(checker, '/workspace/.agent-tmp/checker-joined.png');

await browser.close();
