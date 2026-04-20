#!/usr/bin/env node
/**
 * Takes screenshots of all Storybook stories from a pre-built Storybook directory.
 *
 * Serves the static Storybook build using a local HTTP server, then uses Playwright to visit each
 * story's iframe URL and capture a screenshot. This script is intended to be run twice on different
 * commits (the PR branch and the target branch) so the resulting screenshots can be compared.
 *
 * Usage: node scripts/take-storybook-screenshots.mjs <storybook-dir> <output-dir>
 *
 *   storybook-dir  Path to the built Storybook directory (e.g. storybook-static)
 *   output-dir     Directory in which to save screenshots (created if it does not exist)
 *
 * Each screenshot is saved as <story-id>.png (e.g. "avatar--default.png").
 * Exits with code 1 if any story fails after two attempts.
 */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { spawn } from 'child_process';

const SERVER_PORT = 6006;
const STORY_LOAD_TIMEOUT_MS = 30_000;
// Wait after disabling animations to allow any in-flight animation frames to settle.
const ANIMATION_SETTLE_MS = 1000;
// Number of stories to process in parallel. Each worker gets its own browser page so waits overlap.
const CONCURRENCY = 4;

// CSS injected into every story page to force all CSS animations and transitions to complete
// immediately, producing deterministic screenshots regardless of animation state.
const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation: none !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition: none !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Waits for the Storybook story's play function (if any) to complete.
 *
 * Polls window.__STORYBOOK_PREVIEW__.currentRender.phase until it is no longer
 * one of the known in-progress values. Using waitForFunction (polling) rather
 * than an event listener avoids the race condition where STORY_RENDERED fires
 * before the listener is registered.
 *
 * Resolves immediately when Storybook is absent, when there is no active render,
 * or when the phase is unknown. Only waits while the phase is a known busy value.
 */
async function waitForPlayFunction(page) {
  await page.waitForFunction(
    () => {
      const preview = window.__STORYBOOK_PREVIEW__;
      if (preview == null) return true;
      const phase = preview?.currentRender?.phase;
      // Proceed if there is no active render or the phase is not recognisable.
      if (phase == null) return true;
      // Wait while the story is known to be actively preparing, rendering, or
      // executing its play function. Any other phase (completed, played, errored,
      // aborted, …) is treated as terminal and we proceed.
      const busyPhases = ['preparing', 'preparing_args', 'preparing_story', 'loading', 'rendering', 'playing'];
      return !busyPhases.includes(phase);
    },
    { timeout: STORY_LOAD_TIMEOUT_MS }
  );
}

/**
 * Starts a local HTTP server serving the given directory using Python's built-in http.server module.
 * Returns the child process so it can be killed when no longer needed.
 */
function startHttpServer(directory) {
  const server = spawn('python3', ['-m', 'http.server', String(SERVER_PORT), '--directory', directory], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  // Log HTTP server output so problems are visible in CI logs.
  server.stderr.on('data', data => process.stderr.write(data));
  server.stdout.on('data', data => process.stdout.write(data));
  return server;
}

/**
 * Polls the local HTTP server until it is accepting connections, then resolves.
 * Throws if the server does not respond within the allotted attempts.
 */
async function waitForServer(port, maxAttempts = 30, intervalMs = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`http://localhost:${port}/`);
      // Any HTTP response (including 404) means the server is up.
      if (response.status != null) return;
    } catch {
      // Server not ready yet; wait before retrying.
    }
    await sleep(intervalMs);
  }
  throw new Error(`HTTP server on port ${port} did not start within ${maxAttempts * intervalMs} ms`);
}

/**
 * Takes a screenshot of a single story, retrying once on failure.
 * Returns { storyId, success }.
 */
async function screenshotStory(story, context, absOutputDir) {
  const { id: storyId } = story;
  const url = `http://localhost:${SERVER_PORT}/iframe.html?id=${storyId}&viewMode=story`;
  const screenshotPath = join(absOutputDir, `${storyId}.png`);

  let success = false;
  for (let attempt = 1; attempt <= 2 && !success; attempt++) {
    let page;
    try {
      page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: STORY_LOAD_TIMEOUT_MS });

      // Wait for the story's play function (if any) to finish. Storybook 8 fires
      // STORY_RENDERED after both the component render and the play function complete.
      await waitForPlayFunction(page);

      // The play function promise resolves (and the Storybook phase becomes 'played') before
      // Angular's zone-scheduled change detection has had a chance to flush the resulting DOM
      // updates. Wait two animation frames: the first allows Angular's final change-detection
      // cycle to run; the second ensures those mutations are committed to the rendered frame.
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

      // Inject CSS that sets all animation and transition durations to zero so no new animations
      // can start or continue after this point.
      await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });

      // Wait one animation frame for the style to take effect, then finish any Web Animations API
      // animations (e.g. Angular Material) that are already in-flight.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      await page.evaluate(() =>
        document.getAnimations().forEach(a => {
          try {
            a.finish();
          } catch (e) {}
        })
      );

      // Wait for Angular change-detection cycles triggered by the finish() calls to settle.
      await page.waitForTimeout(ANIMATION_SETTLE_MS);

      // Second pass: finish any animations that were started during the settle period
      // (e.g. by Angular responding to the first round of finish() calls).
      await page.evaluate(() =>
        document.getAnimations().forEach(a => {
          try {
            a.finish();
          } catch (e) {}
        })
      );

      await page.screenshot({ path: screenshotPath, fullPage: true });
      success = true;
    } catch (err) {
      if (attempt === 2) {
        console.error(`  ✗ ${storyId}: ${err.message}`);
      }
    } finally {
      await page?.close();
    }
  }
  return { storyId, success };
}

async function main() {
  const [, , storybookDir, outputDir] = process.argv;

  if (!storybookDir || !outputDir) {
    console.error('Usage: node scripts/take-storybook-screenshots.mjs <storybook-dir> <output-dir>');
    process.exit(1);
  }

  const absStorybookDir = resolve(storybookDir);
  const absOutputDir = resolve(outputDir);

  mkdirSync(absOutputDir, { recursive: true });

  // Read the story index generated by the Storybook build.
  // Storybook 8+ produces index.json; each entry with type "story" is a story to screenshot.
  const indexPath = join(absStorybookDir, 'index.json');
  let indexData;
  try {
    indexData = JSON.parse(readFileSync(indexPath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read ${indexPath}: ${err.message}`);
    process.exit(1);
  }

  const stories = Object.values(indexData.entries).filter(e => e.type === 'story');
  console.log(`Found ${stories.length} stories`);

  const server = startHttpServer(absStorybookDir);

  // Wait until the HTTP server is actually accepting connections rather than using a fixed sleep.
  await waitForServer(SERVER_PORT);

  let browser;
  let exitCode = 0;

  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    // reducedMotion: 'reduce' causes the browser to honour prefers-reduced-motion media queries,
    // which Angular Material and other libraries use to skip or shorten animations.
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });

    let succeeded = 0;
    let failed = 0;
    const failedStories = [];

    // Process stories in parallel using a shared work queue. Each worker picks the next story
    // from the queue until it is empty, so slow stories do not block faster ones.
    const queue = [...stories];
    async function worker() {
      while (queue.length > 0) {
        const story = queue.shift();
        const { storyId, success } = await screenshotStory(story, context, absOutputDir);
        if (success) {
          console.log(`  ✓ ${storyId}`);
          succeeded++;
        } else {
          failedStories.push(storyId);
          failed++;
        }
      }
    }

    // Launch CONCURRENCY workers; they all draw from the same queue so the total work is evenly spread.
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    console.log(`\nCompleted: ${succeeded} succeeded, ${failed} failed`);
    if (failedStories.length > 0) {
      console.log('Failed stories:');
      for (const id of failedStories) {
        console.log(`  - ${id}`);
      }
      exitCode = 1;
    }
  } finally {
    await browser?.close();
    server.kill();
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
