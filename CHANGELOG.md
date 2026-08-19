# Changelog

All notable changes to this project will be documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-08-19

### Fixed

- `waitForRun()` could return before the run's verdict was written, giving
  `outcome: undefined` and no step results on a run that had actually passed.
  A re-fetch of the same id moments later returned the real verdict. The
  container emits `run_status_changed{status:'completed'}` and
  `run_completed{outcome}` as separate SQS messages with no ordering
  guarantee, and the API skips undefined fields on write, so a status-only
  message marks the run terminal with no outcome. Polling keyed on `status`
  alone, so it returned that intermediate row. `completed` now also requires a
  decided verdict; `failed` and `cancelled` still settle immediately, since
  neither carries one.

### Added

- `TestStepResult` and `TestRunDetails`. `testing.runs.get()` and
  `waitForRun()` return `TestRunDetails` — the run row plus `stepResults`,
  `fullTranscript` and an inline `config` snapshot, all of which the API has
  always sent and neither SDK declared.
  - Named `TestStepResult`, not `StepResult`: the latter is already exported
    for mapping and is an unrelated shape.

## [0.6.0] - 2026-08-19

### Fixed

- `TestRun.outcome` replaces `TestRun.result`. The API has never sent a
  `result` field, so `run.result` read as `undefined` on every run including
  passing ones, and the declared values (`pass`/`fail`/`partial`) did not exist.
  The real field is `outcome`, with uppercase values
  `PASS | FAIL | ERROR | INCONCLUSIVE | pending` — the same `TestRunOutcome`
  the list, aggregate and mission-run types already used. Only the full
  `TestRun` entity had drifted. The removed `TestRunResult` type described a
  field that never existed.
- `ProfileItem` is now the discriminated union the API actually returns, keyed
  on `type`: `ProfileVoiceItem` (`audioId`) or `ProfileDataItem`
  (`datasetId` + `itemId`). It was previously `{id, label, value}` with both
  `label` and `value` required — `value` does not exist on either variant, and
  `label` is deprecated server-side and usually absent. `openapi.yaml` had this
  right as a `oneOf`; the SDK was the drifted surface.
- `profiles.addItem()`, `updateItem()` and `deleteItem()` return the updated
  `Profile`, which is what all three routes send. They were typed as returning
  a `ProfileItem` (and `deleteItem` discarded the body entirely).
- `AddProfileItemRequest` is a union requiring `type` plus the matching id
  field, replacing the invented `{label, value}`. `UpdateProfileItemRequest`
  takes `label` / `description` — the only two fields the handler reads.
- Removed `Profile.matchedLabels`, which appears nowhere in the API.

## [0.5.0] - 2026-08-18

### Added

- `MappingJobConfig` now carries the full configuration surface the API accepts.
  Previously it exposed 9 of the 13 documented fields, and the four it omitted
  included `vertical` — which the API **requires** whenever `mappingMode` is
  `dtmf-audio` or `full-audio`. Audio mapping jobs were therefore impossible to
  create from the SDK; only `dtmf` worked.
  - `vertical` — `FSI | Healthcare | EnergyUtilities | Telecoms | General`.
  - `probeMode` — security-probe flag. Rejected by the API in combination with
    `mappingMode: 'dtmf'`.
  - `repeatConfig` — `{ behavior, maxExplorations? }` for revisited-menu handling.
  - `enrichmentConfig` — `{ enabled, types? }` for the post-run enrichment pipeline.
- New exported types: `Vertical`, `RepeatBehavior`, `RepeatConfig`, `EnrichmentConfig`.

## [0.4.0] - 2026-08-12

### Added

- Digital (chat channel) testing, in beta. Access is limited to beta workspaces
  during the beta period.
  - `client.digitalTesting` — create, list, get, cancel and wait for digital test runs.
  - `client.digitalTestConfigs` — save, update, delete and launch reusable digital test configs.
  - `client.digitalCompliance` — list digital compliance audits and fetch a per-target report.
  - `DigitalSample` carries the shapes the API actually returns, which differ
    from the OpenAPI document: `transcript` is a `DigitalTranscriptTurn[]`
    (`role`/`text`/`at`), not a string, and evidence arrives as separate
    `passEvidence` / `failEvidence` arrays of `DigitalEvidence`
    (`condition`/`reason`) — there is no combined `evidence` field.
  - `DigitalTestRun.configId` — set when the run was launched from a saved
    config. Returned by the API but undeclared in the OpenAPI document.
- `client.testing.listVoices()` — the operator-enabled voices a mission test may
  use, and which is the default.

## [0.3.0] - 2026-07-09

### Added

All changes are additive and backward-compatible with existing signatures.

- **Mapping**
  - `tags?: string[]` on `CreateMappingJobRequest`, `UpdateMappingJobRequest`,
    and the `MappingJob` response type.
  - `mapping.list()` now accepts the full server filter + pagination surface:
    `phoneNumber`, `name`, `profileId`, `tag`, `status`, `createdAfter`,
    `createdBefore`, `sort`, `sortDir`, `limit`, `cursor`. It returns slim
    `MappingJobListItem` values and reads `nextCursor` (falling back to the
    `nextToken` back-compat alias) for pagination.
  - Single-job response (`mapping.get()`) gains `runNumber?` and a nested
    `currentRun?` summary (omitted, never null, when the job has no run).
  - Tree nodes gain the enrichment fields (`stepType`, `voicePrompt`,
    `menuLabel`, `spokenResponse`, `probeCategory`, `probeClassification`,
    `probeRationale`, `audioUrl`, `duration`, `inputRequired`), tree/flat-tree
    responses gain `runNumber?`, and the empty-state envelope
    (`tree: null` + `reason`/`message`) is now typed — branch on `tree === null`.
  - New permissive `CallTelemetry` / `TurnTelemetry` types (all fields optional,
    unknown keys tolerated); `callTelemetry?` may appear on `MappingRun` and
    `turnTelemetry?` on step results.
- **Testing**
  - `testing.runs.list()` (and the `testing.listRuns()` alias) gain filter +
    pagination params (`jobId`, `runType`, `outcome`, `phoneNumber`, `configId`,
    `catalogueTestId`, `startedAfter`, `startedBefore`, `sortBy`, `sortDir`,
    `limit`, `cursor`), returning slim `TestRunListItem` values with `nextCursor`.
  - `testing.aggregateRuns(params)` for `GET /testing/runs/aggregate`.
  - `testing.getMissionTestRun(id)` for `GET /testing/mission-test-runs/{id}`.
- **Mission test configs**
  - `tags?: string[]` on `MissionTestConfig` and `CreateMissionTestConfigRequest`,
    plus `description?` and `phoneNumber?`.
  - `missionTestConfigs.update(id, body)` (PATCH partial update; `description`
    and `tags` accept `null` to clear).
  - `missionTestConfigs.list()` gains filter + pagination params
    (`name`, `phoneNumber`, `sector`, `profileId`, `tag`, `createdAfter`,
    `createdBefore`, `sort`, `sortDir`, `limit`, `cursor`) and returns slim
    `MissionTestConfigListItem` values.

## [0.1.2] - 2026-05-03

### Fixed
- `mappingMode` placement in `CreateMappingJobRequest` and
  `UpdateMappingJobRequest`. The field is moved into `MappingJobConfig`
  to match what the live API actually accepts (the API reads
  `body.config.mappingMode`, not `body.mappingMode`). Calls in 0.1.1
  with `mappingMode` at the top level were silently being rejected by
  the API as "mappingMode is required".
- `MappingJob` response type also drops top-level `mappingMode` for
  consistency. Read the value from `job.config?.mappingMode` instead.

### Migration

```ts
// Before (0.1.1) — sent the value at the top level; API rejected it.
client.mapping.create({
  name: 'Main',
  phoneNumber: '+44...',
  mappingMode: 'dtmf',
});

// After (0.1.2) — nested under config; API accepts.
client.mapping.create({
  name: 'Main',
  phoneNumber: '+44...',
  config: { mappingMode: 'dtmf' },
});
```

## [0.1.1] - 2026-04-21

### Fixed
- Cross-resource response envelope audit. The server uses resource-named
  keys for most list endpoints (and wraps load-test config create/update
  in `{config: {...}}`); the SDK previously assumed `{items: [...]}`
  everywhere, so several list methods returned empty results. Aligned:
  - `mapping.runs(jobId)` — reads `runs` (was: `items`).
  - `mapping.paths(jobId)` — reads `rules` (was: `items`).
  - `batches.list()` / `listPage()` — reads `batches`.
  - `batches.runs(batchId)` and `batches.listRuns()` — read `runs`.
  - `sweeps.list()` / `listPage()` — reads `sweeps`.
  - `sweeps.runs(sweepId)` and `sweeps.listRuns()` — read `runs`.
  - `datasets.list()` / `listPage()` — reads `datasets`.
  - `loadTesting.list()` / `listPage()` — reads `configs`.
  - `loadTesting.listRuns()` — reads `runs`.
  - `scheduler.list()` / `listPage()` — reads `schedules`.
  - `audio.list()` / `listPage()` — reads `audioFiles`.
  - `profiles.list()` / `listPage()` — reads `profiles`.
- `loadTesting.create()` and `loadTesting.update()` now unwrap the
  server's `{config: {...}}` envelope before returning.
- `profiles.findByParameters()` response shape corrected from
  `{items: [...]}` to `{profiles: [...]}`. Callers should read
  `result.profiles`.

### Changed (non-breaking)
- `Paginator` accepts an `itemsKey?: string` option so each resource can
  declare the key its list endpoint uses. Falls back to `items` if the
  declared key is missing, preserving forward compatibility.
- `BatchRun`, `SweepRun`, `LoadTestRun` now declare `id` as the primary
  key (matching the server); `runId` remains on the type as deprecated.

## [0.1.0] — 2026-04-19

### Added
- Initial release.
- `Nopaque` client with full coverage of the API-key-authenticated
  Nopaque REST API: mapping, profiles, testing (configs/jobs/runs),
  batches, sweeps, datasets, load testing, scheduler, enrichment, audio.
- Automatic pagination, polling helpers for long-running jobs,
  one-call audio upload/download.
- Method-aware retry with exponential jitter and `Retry-After` honor.
- Typed error class hierarchy.
- Dual ESM + CJS output with TypeScript definitions.

[Unreleased]: https://github.com/nopaque/node-sdk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nopaque/node-sdk/releases/tag/v0.1.0
