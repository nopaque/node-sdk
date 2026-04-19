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
  mappingMode: 'dtmf',
});
await client.mapping.start(job.id);
const final = await client.mapping.waitForComplete(job.id);
console.log(final.status);

// List audio files with automatic pagination
for await (const audio of client.audio.list()) {
  console.log(audio.id, audio.fileName);
}
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
