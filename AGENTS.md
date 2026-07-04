# Instructions for AI

This document contains information and instructions for AI.

## Architecture

See the software [architecture](doc/architecture.md) overview.

## Rules for writing code

When writing code, follow all rules in [Code rules](doc/code-rules.md) and [Code rules for AI](doc/code-rules-ai.md).

## Code review

Instructions for what to look for when performing a code review can be found in [REVIEW.md](REVIEW.md).

## dev container

The software and a backing database can be run using the [dev container](.devcontainer).

## Local mock services

External dependencies (Auth0, Paratext registry, Paratext send/receive archives, DBL resources)
can be replaced with local mocks so the whole app runs and is testable offline. To use the mock
system:

1. Run `src/MockServices/scripts/doctor.sh` — it reports what is down and prints the exact
   command to fix each thing. Re-run until everything is `[ok]`.
2. Drive the app headlessly with `src/MockServices/scripts/drive.mjs`
   (`projects` / `connect` / `sync` / `text` / `shot`) and script scenarios (users, projects,
   Paratext-side edits, failure injection) with `src/MockServices/client/cli.mjs`.

The "Agent playbook" section of [src/MockServices/README.md](src/MockServices/README.md) has
copy-paste examples, including a full bug-reproduction loop. Test projects are
created and modified through real ParatextData via [src/ParatextProjectTool](src/ParatextProjectTool)
(create/commit ops and `import-project` for existing local Paratext project directories), so they
can be connected, synced, and edited on either the Paratext or Scripture Forge side. Serval runs
for real, locally, with its echo engine (`npm run serval` in src/MockServices), so pre-translation
draft generation also works end to end.

## Running commands

- To run RealtimeServer tests, in directory `src/RealtimeServer` run command `pnpm run test`
- To run backend dotnet tests, in the repo root directory run command `dotnet test`
- To run some frontend tests, in directory `src/SIL.XForge.Scripture/ClientApp` run a command like `pnpm run test:headless --watch=false --include '**/foo.component.spec.ts' --include '**/baz.component.spec.ts'`
- To run all frontend tests, in directory `src/SIL.XForge.Scripture/ClientApp` run command `pnpm run test:headless --watch=false`
