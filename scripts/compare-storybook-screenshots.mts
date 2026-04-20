#!/usr/bin/env -S deno run --allow-read --allow-write

// Compares two sets of Storybook screenshots at the pixel level and creates a Netlify deploy
// directory containing an interactive diff UI for any screenshots that differ.
//
// Reads PNG files from two directories (one for the base commit, one for the PR branch commit),
// decodes each PNG to raw RGBA pixel data, and compares every pixel. Any screenshots that are
// pixel-identical are excluded. Screenshots with different dimensions are always treated as changed.
//
// Output deploy directory layout:
//   index.html         — interactive diff UI (side-by-side and pixel-diff overlay modes)
//   screenshots.json   — diff metadata fetched by index.html
//   base/<story-id>.png    — screenshot from the base commit (changed and removed stories)
//   branch/<story-id>.png  — screenshot from the PR branch commit (changed and added stories)
//
// Usage:
//   scripts/compare-storybook-screenshots.mts <base-dir> <branch-dir> <deploy-dir>
//
// Arguments:
//   base-dir     Directory containing screenshots from the base/target branch
//   branch-dir   Directory containing screenshots from the PR branch
//   deploy-dir   Path where the deploy directory should be written (only created if there are differences)

import { Buffer } from 'node:buffer';
import { join } from 'node:path';
import { PNG } from 'npm:pngjs@7.0.0';

/** Decoded PNG image with raw RGBA pixel data. */
interface DecodedPng {
  width: number;
  height: number;
  /** Flat RGBA buffer: 4 bytes per pixel, row-major order. */
  data: Uint8Array;
}

/** Decodes a PNG file synchronously to raw RGBA pixel data. */
function readPng(filePath: string): DecodedPng {
  const fileData = Deno.readFileSync(filePath);
  const png = PNG.sync.read(Buffer.from(fileData));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength)
  };
}

/**
 * Compares two decoded PNGs at the pixel level.
 * Returns the number of differing pixels, or -1 if the images have different dimensions.
 */
function countDifferingPixels(a: DecodedPng, b: DecodedPng): number {
  if (a.width !== b.width || a.height !== b.height) return -1;
  let diffCount = 0;
  // Each pixel is 4 bytes (R, G, B, A). Compare all channels for each pixel.
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) {
      diffCount++;
    }
  }
  return diffCount;
}

function main(): void {
  const [baseDir, branchDir, deployDir] = Deno.args;

  if (baseDir == null || branchDir == null || deployDir == null) {
    console.error(`Usage: ${import.meta.filename} <base-dir> <branch-dir> <deploy-dir>`);
    Deno.exit(1);
  }

  const baseFiles = new Set([...Deno.readDirSync(baseDir)].filter(entry => entry.isFile && entry.name.endsWith('.png')).map(entry => entry.name));
  const branchFiles = new Set([...Deno.readDirSync(branchDir)].filter(entry => entry.isFile && entry.name.endsWith('.png')).map(entry => entry.name));
  const allFiles: string[] = [...new Set([...baseFiles, ...branchFiles])].sort();

  // Track which stories were removed, added, or changed so we can report and include them in the deploy.
  const removedStories: string[] = [];
  const addedStories: string[] = [];
  // Each entry is [filename, differingPixelCount] where -1 means dimensions differ.
  const changedStories: [string, number][] = [];

  for (const filename of allFiles) {
    const inBase = baseFiles.has(filename);
    const inBranch = branchFiles.has(filename);

    if (inBase && inBranch) {
      const basePng = readPng(join(baseDir, filename));
      const branchPng = readPng(join(branchDir, filename));
      const diffPixels = countDifferingPixels(basePng, branchPng);
      if (diffPixels !== 0) {
        changedStories.push([filename, diffPixels]);
      }
    } else if (inBase) {
      removedStories.push(filename);
    } else {
      addedStories.push(filename);
    }
  }

  // Log the results.
  if (removedStories.length > 0) {
    console.log(`\nStories removed or renamed (${removedStories.length}):`);
    for (const filename of removedStories) {
      console.log(`  - ${filename.slice(0, -4)}`); // strip .png suffix for readability
    }
  }

  if (addedStories.length > 0) {
    console.log(`\nStories added or renamed (${addedStories.length}):`);
    for (const filename of addedStories) {
      console.log(`  + ${filename.slice(0, -4)}`);
    }
  }

  if (changedStories.length > 0) {
    console.log(`\nStories with visual differences (${changedStories.length}):`);
    for (const [filename, pixels] of changedStories) {
      const storyId = filename.slice(0, -4);
      if (pixels === -1) {
        console.log(`  ~ ${storyId} (dimensions differ)`);
      } else {
        console.log(`  ~ ${storyId} (${pixels} pixel${pixels === 1 ? '' : 's'} differ)`);
      }
    }
  }

  const inBothCount = allFiles.length - removedStories.length - addedStories.length;
  const identicalCount = inBothCount - changedStories.length;

  console.log('\nSummary:');
  console.log(`  Base screenshots:   ${baseFiles.size}`);
  console.log(`  Branch screenshots: ${branchFiles.size}`);
  console.log(`  Identical:          ${identicalCount}`);
  console.log(`  Different:          ${changedStories.length}`);
  console.log(`  Only in base:       ${removedStories.length}`);
  console.log(`  Only in branch:     ${addedStories.length}`);

  const totalChanged = changedStories.length + removedStories.length + addedStories.length;

  if (totalChanged === 0) {
    console.log('\nNo visual differences found. No deploy directory created.');
    return;
  }

  // Build the deploy directory structure for Netlify.
  Deno.mkdirSync(join(deployDir, 'base'), { recursive: true });
  Deno.mkdirSync(join(deployDir, 'branch'), { recursive: true });

  for (const [filename] of changedStories) {
    Deno.copyFileSync(join(baseDir, filename), join(deployDir, 'base', filename));
    Deno.copyFileSync(join(branchDir, filename), join(deployDir, 'branch', filename));
  }
  for (const filename of removedStories) {
    Deno.copyFileSync(join(baseDir, filename), join(deployDir, 'base', filename));
  }
  for (const filename of addedStories) {
    Deno.copyFileSync(join(branchDir, filename), join(deployDir, 'branch', filename));
  }

  // Write screenshots.json so that index.html knows which stories to display.
  const screenshotsJson = {
    changed: changedStories.map(([filename, diffPixels]) => ({ filename, diffPixels })),
    removed: removedStories,
    added: addedStories,
    summary: {
      identical: identicalCount,
      changed: changedStories.length,
      removed: removedStories.length,
      added: addedStories.length
    }
  };
  Deno.writeTextFileSync(join(deployDir, 'screenshots.json'), JSON.stringify(screenshotsJson, null, 2));

  // Copy the self-contained diff UI (lives next to this script in the repo).
  const scriptDir = import.meta.dirname!;
  Deno.copyFileSync(join(scriptDir, 'screenshot-diff-index.html'), join(deployDir, 'index.html'));

  console.log(`\nDeploy directory created: ${deployDir}`);
  console.log(`  ${changedStories.length} changed stories (both base and branch screenshots included)`);
  console.log(`  ${removedStories.length + addedStories.length} stories present in only one commit`);
}

main();
