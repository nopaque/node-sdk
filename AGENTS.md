# AGENTS.md - @nopaque/sdk

Instructions for AI coding agents working **on this repository**.

If you are instead trying to *call* the Nopaque API from some other project, read <https://www.nopaque.co.uk/AGENTS.md> - it covers authentication, endpoints, and the cost-and-consent rules for operations that place real phone calls. Do not duplicate that content here.

## What this is

`@nopaque/sdk` is the official Node/TypeScript client for the [Nopaque](https://www.nopaque.co.uk) REST API, which drives TotalPath - a voice testing platform that maps, tests and load-tests IVRs and AI voice agents over real PSTN calls.

- Published package: <https://www.npmjs.com/package/@nopaque/sdk>
- API reference: <https://www.nopaque.co.uk/docs>
- OpenAPI 3.1 document: <https://api.nopaque.co.uk/openapi.json>

## This SDK is hand-written, not generated

There is no code generator in this repository and no generated-code markers in `src/`. Edit the source directly.

When the API adds an endpoint, the change is usually three files: a type in `src/types/`, a resource method in `src/resources/`, and a test in `tests/resources/`. Check the OpenAPI document above for the actual request and response shapes rather than inferring them.

## Layout

| Path | Contents |
| --- | --- |
| `src/` | Package root. `client.ts` is the entry point, `index.ts` the public surface. `transport.ts`, `retry.ts`, `pagination.ts`, `polling.ts`, `config.ts`, `errors.ts` and `s3.ts` are internal plumbing. |
| `src/types/` | TypeScript request/response types, one module per API domain, re-exported from `src/types/index.ts`. |
| `src/resources/` | Resource classes exposing the methods users call, one module per API domain. |
| `tests/` | Vitest unit tests. `tests/resources/` mirrors `src/resources/`. HTTP is stubbed via `tests/helpers/mockFetch.ts` and `msw`. |
| `tests/integration/` | Live tests against the dev API. Run separately. |
| `tests/smoke/` | `verify-exports.mjs`, the dual ESM+CJS resolution check. |
| `examples/` | Runnable usage examples, including a CommonJS one. |

## Commands

**This project uses `pnpm`, not `npm`.** CI runs `pnpm install --frozen-lockfile` against `pnpm-lock.yaml`; using `npm` will produce a `package-lock.json` that does not belong in the repo.

Every command below is one CI actually runs (`.github/workflows/ci.yml`):

```bash
pnpm install --frozen-lockfile

pnpm lint          # eslint src tests
pnpm type-check    # tsc --noEmit
pnpm test          # vitest run
pnpm build         # tsup

node ./tests/smoke/verify-exports.mjs   # dual ESM+CJS resolution check
```

CI runs all five on Node 20 and Node 22. **Run at least `pnpm lint && pnpm type-check && pnpm test && pnpm build` before opening a PR.**

### Integration tests place real API calls

```bash
pnpm test:integration    # vitest run --dir tests/integration
```

These hit the live dev API and require `NOPAQUE_API_KEY` (and optionally `NOPAQUE_BASE_URL`). They are a separate script from `pnpm test` on purpose and are normally exercised only by the nightly workflow. **Do not run them casually** - some API operations place real outbound phone calls and bill a workspace.

## Conventions that will trip you up

- **The package ships dual ESM + CJS** via `tsup`, and CI verifies it with `tests/smoke/verify-exports.mjs`. Any change to exports, the build config, or the `exports` map in `package.json` must keep that check passing. There is a CommonJS example in `examples/commonjs.js` that exists to prove the CJS path works - keep it working.
- **Zero runtime dependencies.** `package.json` has an empty `dependencies` block; everything is a devDependency. Adding a runtime dependency is a deliberate design change, not an implementation detail - do not add one to solve a local problem.
- **Config resolution order** is in `src/config.ts`: the `apiKey` constructor option first, then the `NOPAQUE_API_KEY` environment variable. `NOPAQUE_BASE_URL` overrides the default base URL.
- **ESLint uses the flat config** in `eslint.config.js`.

## Contributing

Branch from `main`, open a PR against `main`. CI must be green.
