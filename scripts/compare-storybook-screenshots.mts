#!/usr/bin/env -S deno run --allow-read --allow-write

// Compares two sets of Storybook screenshots at the pixel level and creates a ZIP of any that differ.
//
// Reads PNG files from two directories (one for the base commit, one for the PR branch commit),
// decodes each PNG to raw RGBA pixel data, and compares every pixel. Any screenshots that are
// pixel-identical are discarded so the resulting artifact stays small. Screenshots with different
// dimensions are always treated as changed.
//
// Output ZIP layout:
//   base/<story-id>.png    — screenshot from the base commit
//   branch/<story-id>.png  — screenshot from the PR branch commit
//
// Usage:
//   scripts/compare-storybook-screenshots.mts <base-dir> <branch-dir> <output-zip>
//
// Arguments:
//   base-dir     Directory containing screenshots from the base/target branch
//   branch-dir   Directory containing screenshots from the PR branch
//   output-zip   Path where the ZIP artifact should be written (only created if there are differences)

import { Buffer } from 'node:buffer';
import { join } from 'node:path';
import { PNG } from 'npm:pngjs@7.0.0';
import { zipSync } from 'npm:fflate@0.8.2';

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
  const [baseDir, branchDir, outputZip] = Deno.args;

  if (baseDir == null || branchDir == null || outputZip == null) {
    console.error(`Usage: ${import.meta.filename} <base-dir> <branch-dir> <output-zip>`);
    Deno.exit(1);
  }

  const baseFiles = new Set([...Deno.readDirSync(baseDir)].filter(entry => entry.isFile && entry.name.endsWith('.png')).map(entry => entry.name));
  const branchFiles = new Set([...Deno.readDirSync(branchDir)].filter(entry => entry.isFile && entry.name.endsWith('.png')).map(entry => entry.name));
  const allFiles: string[] = [...new Set([...baseFiles, ...branchFiles])].sort();

  // Track which stories were removed, added, or changed so we can report and include them in the ZIP.
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
    console.log('\nNo visual differences found. No ZIP file created.');
    return;
  }

  // Build the ZIP in memory using fflate. PNG files are already compressed, so we store them
  // without additional compression (level: 0) to keep the process fast.
  const zipEntries: Record<string, [Uint8Array, { level: 0 }]> = {};

  for (const [filename, _pixels] of changedStories) {
    zipEntries[`base/${filename}`] = [Deno.readFileSync(join(baseDir, filename)), { level: 0 }];
    zipEntries[`branch/${filename}`] = [Deno.readFileSync(join(branchDir, filename)), { level: 0 }];
  }
  for (const filename of removedStories) {
    zipEntries[`base/${filename}`] = [Deno.readFileSync(join(baseDir, filename)), { level: 0 }];
  }
  for (const filename of addedStories) {
    zipEntries[`branch/${filename}`] = [Deno.readFileSync(join(branchDir, filename)), { level: 0 }];
  }

  const zipData = zipSync(zipEntries);
  Deno.writeFileSync(outputZip, zipData);

  console.log(`\nZIP artifact created: ${outputZip}`);
  console.log(`  ${changedStories.length} changed stories (both base and branch screenshots included)`);
  console.log(`  ${removedStories.length + addedStories.length} stories present in only one commit`);
}

main();
