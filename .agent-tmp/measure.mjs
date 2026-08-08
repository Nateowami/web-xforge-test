// Measures main-thread blocking while typing in the SF editor with Lynx insights on.
import fs from 'node:fs';
import path from 'node:path';

const APP = 'http://localhost:5000';
const CONTROL = 'http://localhost:5100/_control';
const authId = 'oauth2|paratext|mock-admin';
const label = process.argv[2] ?? 'before';

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
page.setDefaultTimeout(120000);

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

const id = await page.evaluate(async () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('@@auth0spajs@@'));
  const entry = keys.map(k => JSON.parse(localStorage.getItem(k) ?? 'null')).find(v => v?.body?.access_token);
  const res = await fetch('/paratext-api/projects', {
    headers: { Authorization: `Bearer ${entry.body.access_token}` }
  });
  return (await res.json()).find(p => p.shortName === 'MTRG').projectId;
});

const t0 = Date.now();
await page.goto(`${APP}/projects/${id}/translate/RUT/1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(30000);
console.log(`[${label}] editor page settled after ${Date.now() - t0}ms`);

await page.evaluate(() => {
  window.__lt = { total: 0, max: 0, count: 0 };
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      window.__lt.total += e.duration;
      window.__lt.count++;
      if (e.duration > window.__lt.max) window.__lt.max = e.duration;
    }
  }).observe({ entryTypes: ['longtask'] });
});

const editor = page.locator('quill-editor .ql-editor').first();
await editor.click({ position: { x: 300, y: 40 } }).catch(e => console.log('click:', e.message.split('\n')[0]));
await page.waitForTimeout(4000);
await page.evaluate(() => (window.__lt = { total: 0, max: 0, count: 0 })); // reset after the click settles

const tType = Date.now();
for (let i = 0; i < 8; i++) {
  await page.keyboard.type('a');
  await page.waitForTimeout(800);
}
await page.waitForTimeout(4000);
const lt = await page.evaluate(() => window.__lt);
console.log(
  `[${label}] 8 keystrokes over ${Date.now() - tType}ms | long tasks: ${lt.count}, total blocked ${Math.round(
    lt.total
  )}ms, worst ${Math.round(lt.max)}ms`
);

await page.screenshot({ path: `${label}-typing.png`, timeout: 20000 }).catch(() => {});
await browser.close();
