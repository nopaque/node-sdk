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

### Mission tests in another language

A mission test call is held in English unless you say otherwise. Pass
`language` on create to hold it in another language, or `multi` when the IVR
may start in English and switch mid-call.

```ts
import type { CallLanguage } from '@nopaque/sdk';

const run = await client.missionTests.create({
  sector: 'insurance',
  mission: 'Get a quote for a new policy',
  acceptance: 'The agent states a premium',
  profile: { phoneNumber: '+34911234567' },
  language: 'es', // omit for English
});

console.log(run.language); // 'es'
```

Accepted codes (`CallLanguage`): `en`, `multi`, `es`, `fr`, `de`, `it`, `pt`,
`nl`, `hi`, `ru`, `ja`. Omitting the field sends no `language` key at all, so
the API applies its own default; a run with no `language` on it was English.

**These are not the transcription language codes.** Standard tests and mapping
transcribe in a region-qualified code such as `en-GB` (`MappingJobConfig.language`),
and the two sets are not interchangeable: bare `en` is a valid *call* language
but is rejected with a 400 as a transcription language.

### Bring your own carrier

Invite-only. With bring your own carrier (BYOC), a test config's calls go out over your workspace's own SIP
trunk instead of nopaque's network. nopaque sets up the trunks (carrier
integrations) with you. You add routes to them, then point a test config at a route
with `carrierRouteId`.

```ts
// Your trunks, each with its routes.
const [trunk] = await client.testing.carrierIntegrations.list();
console.log(trunk.name, trunk.status, trunk.routes.map((r) => r.name));

// A route is selected by the tech prefix dialled in front of the number.
const route = await client.testing.carrierIntegrations.routes.create(trunk.integrationId, {
  name: 'Vendor X premium',
  techPrefix: 'R7Q2#',
});
console.log('dialable now:', route.dialable); // needs an `active` trunk

const config = await client.testing.configs.create({
  name: 'Main menu via own trunk',
  phoneNumber: '+441234567890',
  carrierRouteId: route.routeId,
  steps: [
    { name: 'Main menu', type: 'dtmf', expected: 'Press 1 for sales', dtmf: '1' },
    { name: 'Sales', type: 'listen', expected: 'Connecting you to sales' },
  ],
});

// The run dials the config's own phoneNumber, through the route or not at all.
const run = await client.testing.runs.create({ testConfigId: config.id });
const done = await client.testing.runs.waitForRun(run.id);

console.log(done.outcome, done.carrier); // { integrationId, routeId }
console.log('hang-up:', done.callTelemetry?.telephony?.sipHangupCause);
for (const step of done.stepResults ?? []) {
  console.log(step.actionType, step.actionValue, step.outcome);
}
```

If the route cannot be dialled when the run starts (the route is disabled or
the trunk is not active), `runs.create()` throws `ConflictError` (409) and no
call is placed. Once the trunk has used its `dailyMinutes` for the day, it throws
`RateLimitError` (429) until 00:00 UTC. To stop a route being used, call
`routes.update(integrationId, routeId, { enabled: false })`.

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
