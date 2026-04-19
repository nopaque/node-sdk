# Changelog

All notable changes to this project will be documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
