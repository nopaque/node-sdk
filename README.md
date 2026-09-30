# @nopaque/sdk — Node SDK for Nopaque

Official Node.js client for the [Nopaque](https://nopaque.co.uk) API.

## Install

```bash
npm install @nopaque/sdk
# or
pnpm add @nopaque/sdk
# or
yarn add @nopaque/sdk
```

## Quick start

```typescript
import { Nopaque } from '@nopaque/sdk';

const client = new Nopaque({ apiKey: process.env.NOPAQUE_API_KEY });

// Create a mapping job and wait until it completes
const job = await client.mapping.create({
  name: 'Main IVR',
  phoneNumber: '+441234567890',
  config: { mappingMode: 'dtmf' },
});
await client.mapping.start(job.id);
const final = await client.mapping.waitForComplete(job.id);
console.log(final.status);

// List audio files with automatic pagination
for await (const audio of client.audio.list()) {
  console.log(audio.id, audio.fileName);
}
```

### Digital testing (beta)

Access is limited to beta workspaces during the beta period.

```ts
const run = await client.digitalTesting.create({
  targetRef: 'acme/billing-bot',
  target: { transport: 'web-widget', url: 'https://example.com/support' },
  // `sector` and `mission` are required on every digital run.
  sector: 'utilities',
  mission: 'Pay my bill',
  kind: 'freeform',
  acceptance: 'The bot states the outstanding balance.',
});

const finished = await client.digitalTesting.waitForRun(run.id);
// `completed` with outcome 'fail' is a RESULT, not an error.
console.log(finished.status, finished.outcome, finished.passRate);
```

### Survey tests

Survey testing reverses the direction: your platform sends the survey, and
nopaque answers as the respondent. Start a test, point your survey at the
number it returns, then wait for the conversation.

```ts
const test = await client.surveys.start({
  configId: 'cfg_123',
  sender: '+447700900123', // the number your survey platform sends FROM
  windowSecs: 300,
});

// Trigger your survey from `sender` to this number before `expiresAt`.
console.log('Send the survey to', test.agentE164);

const result = await client.surveys.waitForResult(test.runId);
// A failed capture is a RESULT, not an error: check `capture.error`.
console.log(result.outcome, result.capture.status);
for (const turn of result.turns) console.log(`${turn.from}: ${turn.text}`);
```

`start()` throws `ConflictError` when the workspace has no free survey number
for that sender. `surveys.list()` shows how many are free.

## Features

- Full coverage of the Nopaque REST API via API-key auth
- Written in TypeScript; full type definitions included
- Automatic pagination for list endpoints
- Polling helpers for long-running jobs (`waitForComplete`)
- One-call audio upload/download wrapping the presigned-URL flow
- Method-aware retry with exponential jitter and `Retry-After` honor
- Typed error classes (`NotFoundError`, `RateLimitError`, etc.)
- Zero runtime dependencies — uses platform `fetch`
- Dual ESM + CJS, works in Node 20+, Next.js server actions, and bundlers

## Documentation

Full reference: <https://nopaque.co.uk/docs/sdks>

## Authentication

```typescript
new Nopaque({ apiKey: 'nop_live_...' });
```

Or set the environment variable:

```bash
export NOPAQUE_API_KEY=nop_live_...
```

API keys are workspace-scoped and subject to per-minute rate limits based on your subscription tier. Free tier cannot use API keys.

## CommonJS

```javascript
const { Nopaque } = require('@nopaque/sdk');
const client = new Nopaque({ apiKey: '...' });
```

## Requirements

- Node 20+

## License

MIT
