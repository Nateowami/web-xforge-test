// Shared helpers for driving the mock stack in two browser contexts.
import fs from 'node:fs';
import path from 'node:path';

const APP = 'http://localhost:5000';
const CONTROL = 'http://localhost:5100/_control';
const clientApp = '/workspace/src/SIL.XForge.Scripture/ClientApp';

const env = { ...process.env };
const pwLibs = path.join(process.env.HOME ?? '', 'pw-libs');
if (fs.existsSync(pwLibs)) {
  env.LD_LIBRARY_PATH = [`${pwLibs}/usr/lib/x86_64-linux-gnu`, `${pwLibs}/lib/x86_64-linux-gnu`, env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(':');
}

export { APP, CONTROL };

export async function launch() {
  const { chromium } = await import(path.join(clientApp, 'node_modules', 'playwright-core', 'index.mjs'));
  return await chromium.launch({ env });
}

export async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addCookies([{ name: '.AspNetCore.Culture', value: 'c=en|uic=en', url: APP }]);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => console.log(`  [pageerror ${page.__label ?? ''}] ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error') console.log(`  [console.error ${page.__label ?? ''}] ${m.text().slice(0, 300)}`);
  });
  return page;
}

export async function login(page, authId, label) {
  page.__label = label ?? authId;
  const response = await fetch(`${CONTROL}/next-login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ authId })
  });
  if (!response.ok) throw new Error(`next-login failed for ${authId}`);
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.locator('a:has-text("Log In"), a:has-text("Log in")').first().click();
  await page.waitForURL(/\/(projects|callback)/, { timeout: 60000 });
  await page.waitForTimeout(4000);
}

export async function rpc(page, endpoint, method, params) {
  return await page.evaluate(
    async ([endpoint, method, params]) => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('@@auth0spajs@@'));
      const entry = keys.map(k => JSON.parse(localStorage.getItem(k) ?? 'null')).find(v => v?.body?.access_token);
      const res = await fetch(`/command-api/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${entry.body.access_token}` },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
      });
      return await res.json();
    },
    [endpoint, method, params]
  );
}

export async function shot(page, file) {
  await page.screenshot({ path: file, timeout: 20000 }).catch(e => console.log('screenshot failed: ' + e.message));
  console.log('  shot: ' + file);
}
