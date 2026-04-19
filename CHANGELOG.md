# Changelog

All notable changes to this project will be documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
