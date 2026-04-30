#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * import-paratext-project.mts
 *
 * Imports a Paratext project directory into the local dev stub so it can be
 * used with Scripture Forge without editing any config files by hand.
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/import-paratext-project.mts /path/to/ParatextProject
 *
 * What it does:
 *  1. Reads Settings.xml from the project directory to extract the Paratext ID,
 *     short name, full name, and language code.
 *  2. Copies the project directory to src/dev-stubs/repos/<paratextId>/.
 *  3. Creates or updates src/dev-stubs/dev-config.json with the project entry
 *     and the repos directory path so neither the stub nor the main app need
 *     manual config edits.
 */

import { parse as parseXml } from "jsr:@libs/xml";
import { copy } from "jsr:@std/fs/copy";
import { exists } from "jsr:@std/fs/exists";
import { resolve, dirname, fromFileUrl, join } from "jsr:@std/path";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Walk up from `start` until a directory containing `marker` is found. */
function findRepoRoot(start: string, marker: string): string | undefined {
  let dir = start;
  while (true) {
    try {
      Deno.statSync(join(dir, marker));
      return dir;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }
}

/**
 * Returns the text content of the first element matching `tagName` in a parsed
 * XML document, or `undefined` if not found.  Handles both attribute-free text
 * nodes and objects with a `#text` key as produced by @libs/xml.
 */
function xmlText(doc: unknown, tagName: string): string | undefined {
  const value = (doc as Record<string, unknown>)?.[tagName];
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const text = (value as Record<string, unknown>)["#text"];
    if (typeof text === "string") return text;
    if (typeof text === "number") return String(text);
  }
  return String(value);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const projectDir = Deno.args[0];
if (!projectDir) {
  console.error(
    "Usage: deno run --allow-read --allow-write scripts/import-paratext-project.mts <project-dir>"
  );
  Deno.exit(1);
}

const projectPath = resolve(projectDir);
const settingsXmlPath = join(projectPath, "Settings.xml");

if (!(await exists(projectPath, { isDirectory: true }))) {
  console.error(`Error: directory not found: ${projectPath}`);
  Deno.exit(1);
}
if (!(await exists(settingsXmlPath))) {
  console.error(`Error: Settings.xml not found in ${projectPath}`);
  Deno.exit(1);
}

// ─── Parse Settings.xml ───────────────────────────────────────────────────────

const settingsXml = await Deno.readTextFile(settingsXmlPath);
let parsed: unknown;
try {
  parsed = parseXml(settingsXml);
} catch (e) {
  console.error(`Error: failed to parse Settings.xml: ${e}`);
  Deno.exit(1);
}

// Settings.xml root element is <ScriptureText>
const root =
  (parsed as Record<string, unknown>)?.["ScriptureText"] ??
  (parsed as Record<string, unknown>)?.["xml"]?.["ScriptureText"];

if (!root) {
  console.error(
    "Error: Settings.xml does not contain a <ScriptureText> element."
  );
  Deno.exit(1);
}

// Extract fields.  The Guid element contains a UUID with dashes; strip them to
// get the 32-hex-character Paratext project ID used by Scripture Forge.
const guidRaw = xmlText(root, "Guid") ?? xmlText(root, "guid");
if (!guidRaw) {
  console.error("Error: Settings.xml is missing the <Guid> element.");
  Deno.exit(1);
}
const paratextId = guidRaw.replace(/-/g, "").toLowerCase();
if (!/^[0-9a-f]{32}$/.test(paratextId)) {
  console.error(`Error: <Guid> value is not a valid UUID: ${guidRaw}`);
  Deno.exit(1);
}

const shortName = xmlText(root, "Name") ?? paratextId;
const fullName = xmlText(root, "FullName") ?? shortName;

// LanguageIsoCode sometimes has the format "eng:::English"; keep only the BCP-47 tag.
const langRaw =
  xmlText(root, "LanguageIsoCode") ?? xmlText(root, "Language") ?? "und";
const languageIsoCode = langRaw.split(":::")[0].split(":")[0].trim() || "und";

// ─── Locate repo root ─────────────────────────────────────────────────────────

const scriptDir = dirname(fromFileUrl(import.meta.url));
const repoRoot = findRepoRoot(scriptDir, "src/dev-stubs");
if (!repoRoot) {
  console.error(
    "Error: could not find the repository root (looking for src/dev-stubs/)."
  );
  Deno.exit(1);
}

const stubsDir = join(repoRoot, "src", "dev-stubs");
const reposDir = join(stubsDir, "repos");
const destDir = join(reposDir, paratextId);
const devConfigPath = join(stubsDir, "dev-config.json");

// ─── Copy the project repository ──────────────────────────────────────────────

console.log(`\nImporting project:`);
console.log(`  Short name : ${shortName}`);
console.log(`  Full name  : ${fullName}`);
console.log(`  Language   : ${languageIsoCode}`);
console.log(`  ID         : ${paratextId}`);
console.log(`  Source     : ${projectPath}`);
console.log(`  Dest       : ${destDir}\n`);

if (await exists(destDir)) {
  console.log(`Destination already exists — overwriting…`);
}

try {
  await copy(projectPath, destDir, { overwrite: true });
  console.log(`Copied project files.`);
} catch (e) {
  console.error(`Error: failed to copy project: ${e}`);
  Deno.exit(1);
}

// ─── Update dev-config.json ───────────────────────────────────────────────────

/** Shape of a project entry in dev-config.json. */
interface DevProject {
  ParatextId: string;
  ShortName: string;
  FullName: string;
  LanguageIsoCode: string;
  UserRoles: Record<string, string>;
}

/** Shape of the LocalDevParatext section in dev-config.json. */
interface DevConfig {
  LocalDevParatext: {
    ReposDir: string;
    Projects: DevProject[];
  };
}

let config: DevConfig;
if (await exists(devConfigPath)) {
  try {
    config = JSON.parse(await Deno.readTextFile(devConfigPath)) as DevConfig;
  } catch {
    console.warn(
      `Warning: dev-config.json could not be parsed — it will be replaced.`
    );
    config = { LocalDevParatext: { ReposDir: "", Projects: [] } };
  }
} else {
  config = { LocalDevParatext: { ReposDir: "", Projects: [] } };
}

// Always write the absolute path so both the stub and the main app can resolve
// the directory without knowing the repo layout.
config.LocalDevParatext.ReposDir = reposDir;

// Add or update the project entry.
const projects = config.LocalDevParatext.Projects;
const existingIndex = projects.findIndex((p) => p.ParatextId === paratextId);
const entry: DevProject = {
  ParatextId: paratextId,
  ShortName: shortName,
  FullName: fullName,
  LanguageIsoCode: languageIsoCode,
  // Preserve existing UserRoles when updating; use sensible defaults for a new import.
  UserRoles:
    existingIndex >= 0
      ? projects[existingIndex].UserRoles
      : { DevAdmin: "pt_administrator", DevUser: "pt_translator" },
};

if (existingIndex >= 0) {
  projects[existingIndex] = entry;
  console.log(`Updated existing project entry in dev-config.json.`);
} else {
  projects.push(entry);
  console.log(`Added project to dev-config.json.`);
}

await Deno.writeTextFile(devConfigPath, JSON.stringify(config, null, 2) + "\n");

console.log(`\nDone!  Restart the dev stub and main app to pick up the change.`);
console.log(
  `If you haven't already, trigger a sync in Scripture Forge to populate the project.\n`
);
