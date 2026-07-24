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
can be replaced with local mocks: start [src/MockServices](src/MockServices) (`npm start`) and run
the backend with `SF_MOCK_SERVICES=true`. Log in without credentials by POSTing
`{"authId":"oauth2|paratext|mock-admin"}` to `http://localhost:5100/_control/next-login` and then
clicking Log In. Scenarios (projects, Paratext-side edits, failure injection) are scripted via
the control API — see [src/MockServices/README.md](src/MockServices/README.md).

## Running commands

- To run RealtimeServer tests, in directory `src/RealtimeServer` run command `pnpm run test`
- To run backend dotnet tests, in the repo root directory run command `dotnet test`
- To run some frontend tests, in directory `src/SIL.XForge.Scripture/ClientApp` run a command like `pnpm run test:headless --watch=false --include '**/foo.component.spec.ts' --include '**/baz.component.spec.ts'`
- To run all frontend tests, in directory `src/SIL.XForge.Scripture/ClientApp` run command `pnpm run test:headless --watch=false`
