# Digital Testing SDK Coverage - Design

**Date:** 2026-08-12
**Repos:** `nopaque/node-sdk`, `nopaque/python-sdk`, `nopaque/api` (version bump only)
**Status:** Approved, ready for implementation planning

## Problem

Both SDKs are at 0.3.0 and cover 72 of the 81 data-plane paths in the OpenAPI
document. The gap is a single cluster: the entire `/digital-testing/*` surface
(8 paths, 12 operations) plus `GET /testing/voices`. Neither SDK has any
digital-testing resource, model, or type.

Digital testing is live in production, gated to beta-tier workspaces in the
frontend nav. Beta customers using the API directly have no SDK path to it.

The OpenAPI document also still declares `version: "0.3.0"` despite having grown
well past what 0.3.0 shipped.

## Scope

13 operations, both SDKs.

| Path | Operations |
| --- | --- |
| `/digital-testing/runs` | `listDigitalTestRuns`, `createDigitalTestRun` |
| `/digital-testing/runs/{id}` | `getDigitalTestRun` |
| `/digital-testing/runs/{id}/cancel` | `cancelDigitalTestRun` |
| `/digital-testing/configs` | `listDigitalTestConfigs`, `createDigitalTestConfig` |
| `/digital-testing/configs/{id}` | `getDigitalTestConfig`, `updateDigitalTestConfig`, `deleteDigitalTestConfig` |
| `/digital-testing/configs/{id}/runs` | `launchDigitalTestConfig` |
| `/digital-testing/compliance-audits` | `listDigitalComplianceAudits` |
| `/digital-testing/compliance-audits/report` | `getDigitalComplianceAudit` |
| `/testing/voices` | `listVoices` |

### Out of scope

Tracked separately, deliberately excluded:

- `MappingJobConfig` drift (missing `vertical`, `probeMode`, `repeatConfig`,
  `enrichmentConfig` in both SDKs)
- The public docs page for digital testing, and its beta framing
- Stale comments in `frontend/src/utils/envUtil.ts` and
  `frontend/src/components/platform/PlatformContent.tsx`
- A beta badge in the product UI

## Architecture

Both SDKs are hand-written with no code generator. The established shape is one
module per API domain across three layers: types/models, resource, tests. This
design adds three domains and follows that shape exactly. No new patterns.

### Resource split

Three flat resources rather than one large resource or nested sub-objects. This
mirrors the existing `missionTests` / `missionTestConfigs` split, where runs and
their saved configs are separate top-level resources.

| Resource | Methods |
| --- | --- |
| `digitalTesting` | `list`, `create`, `get`, `cancel`, `waitForRun` |
| `digitalTestConfigs` | `list`, `create`, `get`, `update`, `delete`, `launch` |
| `digitalCompliance` | `listAudits`, `getReport` |

`listVoices` is added to the existing `testing` resource, not to a digital
resource. The spec tags `/testing/voices` under Mission Tests and it is not a
beta operation.

### Node SDK

| File | Change |
| --- | --- |
| `src/types/digitalTesting.ts` | New. `DigitalTarget`, `DigitalProfile`, `DigitalStepResult`, `DigitalSample`, `DigitalTestRun`, `DigitalTestConfigBase`, `DigitalTestConfig`, plus request and list-params types. |
| `src/types/testing.ts` | Add `ListVoicesResponse` and its `Voice` element type. |
| `src/types/index.ts` | Re-export the new module. |
| `src/resources/digitalTesting.ts` | New resource class. |
| `src/resources/digitalTestConfigs.ts` | New resource class. |
| `src/resources/digitalCompliance.ts` | New resource class. |
| `src/resources/testing.ts` | Add `listVoices`. |
| `src/client.ts` | Wire the three resources. |
| `src/index.ts` | Export the new public surface. |
| `tests/resources/*.test.ts` | One test module per new resource, plus voices coverage. |

Constraints that hold: zero runtime dependencies, dual ESM + CJS output, and the
`tests/smoke/verify-exports.mjs` resolution check must stay green after the
export changes.

### Python SDK

Mirrors the Node split. Every method is implemented **sync and async**, which is
why Python resource modules run two to three times the length of their Node
counterparts. This half is the bulk of the work.

| File | Change |
| --- | --- |
| `src/nopaque/models/digital_testing.py` | New. Pydantic v2 models for the seven schemas plus request models. |
| `src/nopaque/models/testing.py` | Add `ListVoicesResponse`, `Voice`. |
| `src/nopaque/models/__init__.py` | Re-export the new models. |
| `src/nopaque/resources/digital_testing.py` | New resource, sync + async. |
| `src/nopaque/resources/digital_test_configs.py` | New resource, sync + async. |
| `src/nopaque/resources/digital_compliance.py` | New resource, sync + async. |
| `src/nopaque/resources/testing.py` | Add `list_voices`, sync + async. |
| `src/nopaque/_client.py` | Wire the three resources on both clients. |
| `tests/resources/` | One test module per new resource, plus voices coverage. |

Constraints that hold: Python 3.9 target, so no PEP 585/604 generics
(`list[str]`, `X | None`) - the `UP006`, `UP007`, `UP035`, `UP045` ruff ignores
exist for this reason. Line length 100. Version lives only in `_version.py`.

## Three things that need care

### 1. Cursor pagination, bridged at the resource

The digital-testing list endpoints use `cursor` as the request param and return
`nextCursor`. The shared paginators in both SDKs still thread `nextToken`.

Bridge inside each `fetchPage`: send `cursor ?? nextToken`, read
`nextCursor ?? nextToken`. This is what `mapping` and `testing` already do. **Do
not change the shared paginator** - it is on the token contract for every other
resource.

### 2. `getReport` takes `targetRef` as a query param, not a path segment

A `targetRef` contains slashes (`acme/billing-bot`), which a single path segment
cannot hold. The API chose a query string for this reason and the frontend
follows the same choice.

Path-interpolating `targetRef` would break on every realistic target. A test must
pin the query-param form.

### 3. `waitForRun` must not treat a failing bot as an error

The status enum is `pending`, `running`, `completed`, `failed`, `cancelled`.

Per the spec, `failed` means the test could not be **delivered** - an
infrastructure failure, with `failureReason` set. A bot that behaved badly
produces `completed` with `outcome: fail`. These are deliberately not the same
thing.

`waitForRun` resolves on all three terminal states and returns the run. It does
not throw on `outcome: fail`. It uses the existing `polling.waitFor` helper, as
`batches`, `sweeps`, `mapping`, `loadTesting` and `testing` all do.

## Beta representation

Documentation only. No structural marker.

- Node: `@beta` JSDoc on the three resource classes and their methods.
- Python: docstrings opening with "Beta.", mirroring the spec's own wording -
  "Access is limited to beta workspaces during the beta period."

Rationale: a `client.beta.digitalTesting` namespace would make beta status
impossible to miss, but promoting to GA becomes a breaking rename for exactly the
early adopters who took the risk. The API already returns an error to non-beta
workspaces, which is the enforcing layer. The SDK's job is to say so, not to
gate.

`listVoices` carries no beta annotation - it is not a beta operation.

## Versioning and release

| Artifact | Change |
| --- | --- |
| `api/openapi/openapi.yaml` | `version: "0.3.0"` -> `"0.4.0"` |
| `@nopaque/sdk` (npm) | 0.3.0 -> 0.4.0 |
| `nopaque` (PyPI) | 0.3.0 -> 0.4.0, via `_version.py` only |

CHANGELOG entry in each SDK repo. Published to the stable channel: beta
workspaces get working methods, and every other workspace gets an error from the
API, which is the honest signal.

## Testing

Unit tests only. Integration tests are untouched - they hit the live dev API and
some operations place real outbound phone calls and bill a workspace.

Coverage per resource:

- Path and HTTP verb for all 13 operations
- Cursor pagination bridging, including a second page
- `cancel` on a run
- `waitForRun` across each terminal state, and on timeout
- `getReport` sending `targetRef` as a query param, with a slash-containing value

Full gate before each PR:

```bash
# node-sdk
pnpm lint && pnpm type-check && pnpm test && pnpm build
node ./tests/smoke/verify-exports.mjs

# python-sdk
hatch run lint && hatch run type && hatch run test
```

## Delivery

Three PRs, each branched off `main` and targeting `main`:

1. `nopaque/api` - OpenAPI version bump to 0.4.0. Small, independent.
2. `nopaque/node-sdk` - types, three resources, `listVoices`, tests, 0.4.0.
3. `nopaque/python-sdk` - the same, sync and async, 0.4.0.

The two SDK PRs are independent of each other and of the version bump.

## Open questions

None blocking. The spec-version bump was agreed as its own PR against `api`
rather than riding with an SDK PR.
