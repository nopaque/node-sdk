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

### Languages

There are **two different language sets**, and they are not interchangeable.

| | Used by | Shape | Default |
| --- | --- | --- | --- |
| `TranscriptionLanguage` | `testing.configs`, `mapping` | region-qualified (`en-GB`) | `en-GB` |
| `CallLanguage` | `missionTests`, `missionTestConfigs` | mostly bare (`en`) | English |

The trap: **bare `en` is a valid call language and is rejected with a 400 as a
transcription language**, which wants `en-GB`. Both unions are exported, so the
compiler catches a code used on the wrong field.

#### Transcription language (standard tests and mapping)

```ts
import type { TranscriptionLanguage } from '@nopaque/sdk';

const config = await client.testing.configs.create({
  name: 'Menú principal',
  phoneNumber: '+34911234567',
  steps: [],
  language: 'es', // omit for en-GB
});

// Updating other fields never resets the language: omitting the key leaves
// the saved value alone, with no implicit reversion to en-GB.
await client.testing.configs.update(config.id, { description: 'Updated' });

// Mapping takes it on the job config.
await client.mapping.create({
  name: 'Flemish IVR',
  phoneNumber: '+32477123456',
  config: { mappingMode: 'dtmf', language: 'nl-BE' },
});
```

57 codes: `en-GB`, `en-US`, `en-AU`, `en-IN`, `en-NZ`, `multi`, `ar`, `be`,
`bn`, `bs`, `bg`, `ca`, `zh-HK`, `zh`, `hr`, `cs`, `da`, `nl`, `et`, `fi`,
`nl-BE`, `fr`, `de`, `el`, `gu`, `he`, `hi`, `hu`, `id`, `it`, `ja`, `kn`,
`ko`, `lv`, `lt`, `mk`, `ms`, `mr`, `no`, `fa`, `pl`, `pt`, `ro`, `ru`, `sr`,
`sk`, `sl`, `es`, `sv`, `tl`, `ta`, `te`, `th`, `tr`, `uk`, `ur`, `vi`.
There is deliberately **no bare `en`**. `nl-BE` is Flemish, `zh-HK` is
Cantonese, and `multi` code-switches.

#### Call language (mission tests)

A mission test call is held in English unless you say otherwise. Use `multi`
when the IVR may start in English and switch mid-call.

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

// Saved mission test configs take it too; `null` clears it back to English.
await client.missionTestConfigs.update('cfg_1', { language: null });
```

11 codes: `en`, `multi`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `hi`, `ru`, `ja`.

Both sets, with labels for showing a person and each set's default, come from
`client.testing.listLanguages()` (`GET /languages`), which returns them as two
separate lists.

In both cases, omitting the field sends no `language` key at all, so the API
applies its own default rather than the SDK guessing one.

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

### Load-test reports and exports

A report covers 1 to 20 finished load-test runs and builds up to three files
(`data`, `excel`, `pdf`). An export is a zip of every call and step in one run.
Both build in the background.

```ts
let report = await client.loadTesting.createReport({ loadTestRunIds: [runId] });
while (report.status === 'pending' || report.status === 'running') {
  await new Promise((r) => setTimeout(r, 10_000));
  report = await client.loadTesting.getReport(report.reportId);
}
if (report.status === 'ready') {
  const pdf = await client.loadTesting.getReportFileUrl(report.reportId, 'pdf'); // link valid 1 hour
} else {
  console.error('report failed:', report.error);
}

const exp = await client.loadTesting.createExport(runId);
const done = await client.loadTesting.getExport(runId, exp.exportId); // downloadUrl when ready

// Why calls failed, grouped by pattern, and the calls in one pattern.
const { patterns } = await client.loadTesting.getFailurePatterns(runId);
if (patterns.length > 0) {
  for await (const call of client.loadTesting.listFailurePatternCalls(runId, patterns[0].id)) {
    console.log(call.callId, call.failedStepName);
  }
}
```

### Numbers

Rent phone numbers to use as caller IDs or test destinations.

```ts
const { numbers, allowance } = await client.numbers.list();
const offers = await client.numbers.listAvailable({ country: 'GB', numberType: 'outbound' });

// Spends money: a monthly charge per number. Do not retry an order blindly;
// a repeat call orders a second number.
const order = await client.numbers.order({
  e164: offers.numbers[0].e164,
  numberType: 'outbound',
  country: 'GB',
});
if (order.orderId) {
  const progress = await client.numbers.getOrder(order.orderId); // about a day in the UK
}

await client.numbers.update(order.number.numberId, { uses: ['load'] });
await client.numbers.release(order.number.numberId); // billing stops
```

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
