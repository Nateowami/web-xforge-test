// Repro driver for SF-3522: Lynx insights panel hang with heavy warning load.
// Usage: node repro.mjs [outPrefix]
import fs from 'node:fs';
import path from 'node:path';

const APP = 'http://localhost:5000';
const CONTROL = 'http://localhost:5100/_control';
const authId = 'oauth2|paratext|mock-admin';
const outPrefix = process.argv[2] ?? 'before';

const clientApp = '/workspace/src/SIL.XForge.Scripture/ClientApp';
const { chromium } = await import(path.join(clientApp, 'node_modules', 'playwright-core', 'index.mjs'));

const env = { ...process.env };
const pwLibs = path.join(process.env.HOME ?? '', 'pw-libs');
if (fs.existsSync(pwLibs)) {
  env.LD_LIBRARY_PATH = [`${pwLibs}/usr/lib/x86_64-linux-gnu`, `${pwLibs}/lib/x86_64-linux-gnu`, env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(':');
}

const browser = await chromium.launch({ env });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.setDefaultTimeout(60000);

const shot = f => page.screenshot({ path: f, timeout: 15000 }).catch(() => {});

async function login() {
  await fetch(`${CONTROL}/next-login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ authId })
  });
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.locator('a:has-text("Log In"), a:has-text("Log in")').first().click();
  await page.waitForURL(/\/(projects|callback)/, { timeout: 60000 });
  await page.waitForTimeout(3000);
}

async function projectId() {
  return await page.evaluate(async () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('@@auth0spajs@@'));
    const entry = keys.map(k => JSON.parse(localStorage.getItem(k) ?? 'null')).find(v => v?.body?.access_token);
    const res = await fetch('/paratext-api/projects', {
      headers: { Authorization: `Bearer ${entry.body.access_token}` }
    });
    const projects = await res.json();
    return projects.find(p => p.shortName === 'MTRG').projectId;
  });
}

/** Measures main-thread responsiveness: max gap between 100ms interval ticks. */
async function startResponsivenessProbe() {
  await page.evaluate(() => {
    window.__probe = { maxGap: 0, last: performance.now(), gaps: [] };
    window.__probeTimer = setInterval(() => {
      const now = performance.now();
      const gap = now - window.__probe.last;
      window.__probe.last = now;
      if (gap > window.__probe.maxGap) window.__probe.maxGap = gap;
      if (gap > 300) window.__probe.gaps.push(Math.round(gap));
    }, 100);
  });
}

async function readProbe() {
  return await page.evaluate(() => {
    const p = window.__probe;
    clearInterval(window.__probeTimer);
    return { maxGap: Math.round(p.maxGap), longGaps: p.gaps };
  });
}

await login();
const id = await projectId();
console.log('project', id);

// 1) Enable Lynx assessments + both checkers on the project settings page.
await page.goto(`${APP}/projects/${id}/settings`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
for (const cbId of [
  '#checkbox-lynx-assessments',
  '#checkbox-lynx-punctuation-checker',
  '#checkbox-lynx-allowed-character-checker'
]) {
  const cb = page.locator(`${cbId} input`).first();
  await cb.waitFor({ timeout: 20000 });
  if (!(await cb.isChecked())) {
    await cb.click({ force: true });
    await page.waitForTimeout(2500);
  }
}
await shot(`${outPrefix}-0-settings.png`);
console.log('settings done');

// 2) Editor
await page.goto(`${APP}/projects/${id}/translate/RUT/1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(15000);
await shot(`${outPrefix}-1-editor.png`);

// 3) Open the insights panel
const panelBtn = page.locator('app-lynx-insight-status-indicator').first();
await panelBtn.click({ timeout: 30000 }).catch(e => console.log('panel button click failed', e.message));
await page.waitForTimeout(10000);
await shot(`${outPrefix}-2-panel.png`);

// Switch the panel scope to the whole project (report: >6,690 warnings project-wide)
await page
  .locator('app-lynx-insights-panel-header .mat-mdc-tab', { hasText: /project/i })
  .first()
  .click({ timeout: 15000 })
  .catch(e => console.log('scope tab click failed', e.message));
await page.waitForTimeout(8000);
await shot(`${outPrefix}-2b-project-scope.png`);

const groups = page.locator('app-lynx-insights-panel mat-tree-node .level-desc');
const n = await groups.count();
console.log('group nodes:', n);
for (let i = 0; i < n; i++) {
  console.log('  -', (await groups.nth(i).innerText()).replace(/\s+/g, ' '));
}

// 4) Click the group node with the biggest count (the "character" groups) and measure the hang.
let bestIdx = 0;
let bestCount = -1;
for (let i = 0; i < n; i++) {
  const c = parseInt((await groups.nth(i).locator('.count').innerText()) || '0', 10);
  if (c > bestCount) {
    bestCount = c;
    bestIdx = i;
  }
}
console.log(`expanding group #${bestIdx} with ${bestCount} children`);

await startResponsivenessProbe();
const t0 = Date.now();
// Click the tree toggle via the DOM (the node may be scrolled out of the panel viewport)
await groups.nth(bestIdx).evaluate(el => el.closest('button.tree-toggle').click());
await page.waitForTimeout(30000);
const probe = await readProbe();
console.log('elapsed ms', Date.now() - t0);
console.log('probe', JSON.stringify(probe));
await shot(`${outPrefix}-3-expanded.png`);

// 5) Is the "Show more" button usable yet?
const showMore = page.locator('app-lynx-insights-panel .show-more-button').first();
if (await showMore.isVisible().catch(() => false)) {
  console.log('show-more text:', (await showMore.innerText()).replace(/\s+/g, ' '));
  console.log('show-more disabled:', await showMore.isDisabled());
} else {
  console.log('show-more button not visible');
}

// 6) How many leaf rows actually rendered, and how many snippets got computed?
const leaves = await page.locator('app-lynx-insights-panel mat-tree-node .leaf').count();
const stillLoading = await page.locator('app-lynx-insights-panel .insight-loading-text').count();
console.log('leaf rows rendered:', leaves, 'still showing "loading":', stillLoading);

// 7) Can the user interact with the panel at all? Click the first leaf and time it.
const t2 = Date.now();
await startResponsivenessProbe();
await page
  .locator('app-lynx-insights-panel mat-tree-node .leaf')
  .first()
  .evaluate(el => el.click())
  .catch(e => console.log('leaf click failed:', e.message));
await page.waitForTimeout(15000);
console.log('leaf click elapsed ms', Date.now() - t2, JSON.stringify(await readProbe()));
await shot(`${outPrefix}-4-leaf-clicked.png`);

await browser.close();
