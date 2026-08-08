// CPU-profiles a single keystroke in the SF editor with Lynx insights enabled.
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
page.setDefaultTimeout(60000);

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

await page.goto(`${APP}/projects/${id}/translate/RUT/1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);
const count = await page
  .locator('app-lynx-insight-status-indicator')
  .innerText()
  .catch(() => '?');
console.log('chapter insight badge:', count.replace(/\s+/g, ' '));

const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });

const editor = page.locator('quill-editor .ql-editor').first();
await editor.click({ position: { x: 200, y: 60 } }).catch(e => console.log('editor click failed', e.message));
await page.waitForTimeout(3000);

await cdp.send('Profiler.start');
const t0 = Date.now();
await page.keyboard.type('X');
await page.waitForTimeout(6000);
const elapsed = Date.now() - t0;
const { profile } = await cdp.send('Profiler.stop');

// Aggregate self time per function
const byId = new Map(profile.nodes.map(n => [n.id, n]));
const self = new Map();
const total = profile.samples?.length ?? 0;
for (const s of profile.samples ?? []) {
  const n = byId.get(s);
  if (n == null) continue;
  const f = n.callFrame;
  const key = `${f.functionName || '(anon)'} @ ${(f.url || '').split('/').pop()}:${f.lineNumber + 1}`;
  self.set(key, (self.get(key) ?? 0) + 1);
}
const totalMs = (profile.endTime - profile.startTime) / 1000;
console.log(`\n[${label}] keystroke window ${elapsed}ms, profile ${Math.round(totalMs)}ms, ${total} samples`);
console.log('top self time:');
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(
    `  ${((v / total) * 100).toFixed(1).padStart(5)}%  ${Math.round((v / total) * totalMs)
      .toString()
      .padStart(6)}ms  ${k}`
  );
}

// Inclusive time: how many samples have <fn> anywhere on the stack
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const inclusive = name => {
  let hits = 0;
  for (const s of profile.samples ?? []) {
    for (let id = s; id != null; id = parent.get(id)) {
      if (byId.get(id)?.callFrame.functionName === name) {
        hits++;
        break;
      }
    }
  }
  return Math.round((hits / total) * totalMs);
};
// Attribute each sample to the nearest app-code (main-*.js) frame on its stack
const appAttr = new Map();
for (const s of profile.samples ?? []) {
  let key = '(no app frame)';
  for (let id = s; id != null; id = parent.get(id)) {
    const f = byId.get(id)?.callFrame;
    if (f?.url?.includes('/main-')) {
      key = `${f.functionName || '(anon)'} @ ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
      break;
    }
  }
  appAttr.set(key, (appAttr.get(key) ?? 0) + 1);
}
console.log('\ntime attributed to nearest app-code frame on the stack:');
for (const [k, v] of [...appAttr.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(
    `  ${((v / total) * 100).toFixed(1).padStart(5)}%  ${Math.round((v / total) * totalMs)
      .toString()
      .padStart(6)}ms  ${k}`
  );
}

console.log('\ninclusive time (ms in the profile window):');
for (const fn of [
  'dataRangeToEditorRange',
  'adjustInsightRange',
  'handleSelectionChange',
  'refreshInsightFormatting',
  'matchesFilter'
]) {
  console.log(`  ${fn}: ${inclusive(fn)}ms`);
}

await page.screenshot({ path: `${label}-profile-editor.png`, timeout: 15000 }).catch(() => {});
await browser.close();
