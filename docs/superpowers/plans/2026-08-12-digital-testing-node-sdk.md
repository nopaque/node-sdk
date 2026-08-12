# Digital Testing Coverage (Node SDK) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 12 `/digital-testing/*` operations plus `GET /testing/voices` to `@nopaque/sdk`, and release it as 0.4.0.

**Architecture:** Three new flat resource classes (`digitalTesting`, `digitalTestConfigs`, `digitalCompliance`) plus one method on the existing `testing` resource, following the established one-module-per-domain layout. All types live in a single new `src/types/digitalTesting.ts`. No new runtime dependencies and no changes to shared plumbing.

**Tech Stack:** TypeScript, Vitest, tsup (dual ESM + CJS), pnpm, ESLint flat config.

**Spec:** `docs/superpowers/specs/2026-08-12-digital-testing-sdk-coverage-design.md`

## Global Constraints

- **Package manager is `pnpm`, never `npm`.** CI runs `pnpm install --frozen-lockfile`. An `npm` run produces a `package-lock.json` that must not be committed.
- **Zero runtime dependencies.** `dependencies` in `package.json` stays empty. Do not add one to solve a local problem.
- **Dual ESM + CJS.** Any change to exports must keep `node ./tests/smoke/verify-exports.mjs` passing.
- **All relative imports use the `.js` extension**, including from `.ts` files (`import { Resource } from '../resource.js'`).
- **Do not modify `src/pagination.ts`.** Every other resource depends on its `nextToken` contract. Cursor differences are bridged inside each resource's `fetchPage`.
- **Beta wording, verbatim from the OpenAPI document:** "Beta. Access is limited to beta workspaces during the beta period."
- **`listVoices` is not a beta operation.** It carries no `@beta` annotation.
- Full gate before opening the PR: `pnpm lint && pnpm type-check && pnpm test && pnpm build` and `node ./tests/smoke/verify-exports.mjs`.
- Branch from `main`, PR against `main`.

---

### Task 1: Type module

**Files:**
- Create: `src/types/digitalTesting.ts`
- Modify: `src/types/index.ts`
- Modify: `src/types/testing.ts` (add `Voice`, `ListVoicesResponse`)

**Interfaces:**
- Consumes: nothing.
- Produces: every type the later tasks import. Exact names below.

- [ ] **Step 1: Write the type module**

Create `src/types/digitalTesting.ts`:

```ts
/** Amazon Connect chat via StartChatContact plus the participant websocket. */
export interface ConnectChatTarget {
  transport: 'connect-chat';
  instanceId: string;
  contactFlowId: string;
  region?: string;
  attributes?: Record<string, string>;
  assumeRoleArn?: string;
}

/** Generic REST chat endpoint, including OpenAI-compatible shapes. */
export interface HttpJsonTarget {
  transport: 'http-json';
  endpoint: string;
  openaiCompatible?: boolean;
  headers?: Record<string, string>;
  model?: string;
}

/** Browser-automated embedded chat widget, for targets with no API at all. */
export interface WebWidgetTarget {
  transport: 'web-widget';
  url: string;
  selectorProfile?: string;
}

/**
 * What `phoneNumber` becomes on a text channel. Discriminated on `transport`.
 * `targetRef` (on the run, not here) is the stable human-readable identity a
 * report aggregates on.
 */
export type DigitalTarget = ConnectChatTarget | HttpJsonTarget | WebWidgetTarget;

export interface SendChatStep {
  type: 'send';
  text: string;
}

export interface ExpectChatStep {
  type: 'expect';
  expected: string;
}

export interface WaitChatStep {
  type: 'wait';
  seconds: number;
}

export interface EndChatStep {
  type: 'end';
}

/** One step of a `kind: standard` test, discriminated on `type`. */
export type ChatStep = SendChatStep | ExpectChatStep | WaitChatStep | EndChatStep;

/** Test data a `standard` run's steps draw on. The voice profile shape minus `voiceItems`. */
export interface DigitalProfile {
  id?: string;
  name?: string;
  items?: Record<string, string>;
}

/** Shaped like the voice `TestStepResult` so a client widens a union rather than learning a second shape. */
export interface DigitalStepResult {
  type?: string;
  expected?: string;
  actual?: string;
  passed?: boolean;
}

/** One conversation, with its own verdict and evidence. */
export interface DigitalSample {
  id?: string;
  outcome?: DigitalOutcome;
  transcript?: string;
  steps?: DigitalStepResult[];
  reason?: string;
}

export type DigitalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type DigitalOutcome = 'pass' | 'fail' | 'inconclusive';
export type DigitalTestKind = 'freeform' | 'compliance' | 'standard';

export interface DigitalTestRun {
  id: string;
  workspaceId: string;
  userId?: string;
  targetRef: string;
  channel: 'chat';
  target?: DigitalTarget;
  kind: DigitalTestKind;
  sector?: string;
  mission?: string;
  acceptance?: string;
  catalogueTestId?: string;
  /**
   * `failed` means the test could not be DELIVERED (an infrastructure failure,
   * with `failureReason` set). A bot that behaved badly produces `completed`
   * with `outcome: 'fail'` - the two are deliberately not the same thing.
   */
  status: DigitalRunStatus;
  outcome?: DigitalOutcome;
  samplesRequested?: number;
  samplesJudged?: number;
  passed?: number;
  failed?: number;
  /**
   * Samples that never produced a verdict because the transport failed. Kept
   * SEPARATE from `passRate`.
   */
  transportErrors?: number;
  /** passed / samplesJudged. Null until the run reaches a verdict. */
  passRate?: number | null;
  sampleOutcomes?: string[];
  samples?: DigitalSample[];
  payloadS3Bucket?: string;
  payloadS3Key?: string;
  payloadBytes?: number;
  failureReason?: string;
  startedAt: string;
  completedAt?: string;
  /** Still `pending` past this means no worker ever picked the job up. */
  launchDeadline?: string;
}

export interface DigitalTestConfigBase {
  name?: string;
  description?: string;
  targetRef?: string;
  target?: DigitalTarget;
  sector?: string;
  mission?: string;
  kind?: DigitalTestKind;
  /** Required for `kind: 'freeform'`. */
  acceptance?: string;
  /** Required for `kind: 'compliance'`. Matches `^M-\d{3}$`. */
  catalogueTestId?: string;
  passConditions?: string[];
  failConditions?: string[];
  setup?: string;
  additionalContext?: string;
  profileId?: string;
  steps?: ChatStep[];
  samples?: number;
}

export interface DigitalTestConfig extends DigitalTestConfigBase {
  id: string;
  workspaceId: string;
  name: string;
  targetRef: string;
  target: DigitalTarget;
  sector: string;
  mission: string;
  kind: DigitalTestKind;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateDigitalTestRunRequest = DigitalTestConfigBase & {
  targetRef: string;
  target: DigitalTarget;
};

export type CreateDigitalTestConfigRequest = DigitalTestConfigBase & {
  name: string;
  targetRef: string;
  target: DigitalTarget;
};

export type UpdateDigitalTestConfigRequest = DigitalTestConfigBase;

/**
 * Optional overrides. Everything not supplied comes from the saved config.
 * `target` and `targetRef` must be overridden TOGETHER - a half-override is a 400.
 */
export interface LaunchDigitalTestConfigRequest {
  targetRef?: string;
  target?: DigitalTarget;
  samples?: number;
}

export interface DigitalTestRunListParams {
  targetRef?: string;
  limit?: number;
  cursor?: string;
  nextToken?: string | null;
  [key: string]: unknown;
}

export interface DigitalTestConfigListParams {
  limit?: number;
  cursor?: string;
  nextToken?: string | null;
  [key: string]: unknown;
}

export interface DigitalComplianceAuditSummary {
  targetRef: string;
  lastRunAt: string;
  runCount: number;
  catalogueTestIds: string[];
}
```

Append to `src/types/testing.ts`:

```ts
export interface Voice {
  id: string;
  name?: string;
  provider?: string;
  language?: string;
  isDefault?: boolean;
}

/** Response for `GET /testing/voices`. */
export interface ListVoicesResponse {
  voices: Voice[];
  /**
   * Which voice is used when a mission test does not choose one. Absent only
   * if no voice is flagged default.
   */
  defaultVoiceId?: string;
}
```

Add to `src/types/index.ts`, following the existing re-export style in that file:

```ts
export * from './digitalTesting.js';
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm type-check`
Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/digitalTesting.ts src/types/testing.ts src/types/index.ts
git commit -m "feat(types): add digital testing and voice types"
```

---

### Task 2: `listVoices` on the testing resource

**Files:**
- Modify: `src/resources/testing.ts`
- Test: `tests/resources/testing.test.ts`

**Interfaces:**
- Consumes: `ListVoicesResponse` from Task 1.
- Produces: `client.testing.listVoices(requestOptions?): Promise<ListVoicesResponse>`.

Start here because it is the smallest end-to-end slice and proves the wiring before the larger resources land.

- [ ] **Step 1: Write the failing test**

Append to `tests/resources/testing.test.ts`:

```ts
describe('TestingResource.listVoices', () => {
  it('GETs /testing/voices and returns voices with the default', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          voices: [{ id: 'v1', name: 'Ultra', isDefault: true }],
          defaultVoiceId: 'v1',
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.testing.listVoices();
    expect(calls[0].url).toContain('/testing/voices');
    expect(calls[0].init.method).toBe('GET');
    expect(r.voices).toHaveLength(1);
    expect(r.defaultVoiceId).toBe('v1');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run tests/resources/testing.test.ts -t listVoices`
Expected: FAIL — `c.testing.listVoices is not a function`.

- [ ] **Step 3: Implement**

Add the import to the existing type import block at the top of `src/resources/testing.ts`, then add this method to `class TestingResource` (after `listRuns`):

```ts
  /** GET /testing/voices — operator-enabled voices a mission test may use. */
  async listVoices(requestOptions?: RequestOptions): Promise<ListVoicesResponse> {
    return await this.transport.request('GET', '/testing/voices', { requestOptions });
  }
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm vitest run tests/resources/testing.test.ts -t listVoices`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/resources/testing.ts tests/resources/testing.test.ts
git commit -m "feat(testing): add listVoices"
```

---

### Task 3: `digitalTesting` resource — runs

**Files:**
- Create: `src/resources/digitalTesting.ts`
- Create: `tests/resources/digitalTesting.test.ts`
- Modify: `src/client.ts`, `src/index.ts`

**Interfaces:**
- Consumes: types from Task 1.
- Produces:
  - `client.digitalTesting.create(body: CreateDigitalTestRunRequest, requestOptions?): Promise<DigitalTestRun>`
  - `client.digitalTesting.list(params?: DigitalTestRunListParams, requestOptions?): Paginator<DigitalTestRun>`
  - `client.digitalTesting.listPage(params?, requestOptions?): Promise<Page<DigitalTestRun>>`
  - `client.digitalTesting.get(runId: string, requestOptions?): Promise<DigitalTestRun>`
  - `client.digitalTesting.cancel(runId: string, requestOptions?): Promise<DigitalTestRun>`
  - `client.digitalTesting.waitForRun(runId: string, opts?: DigitalTestingWaitForOptions): Promise<DigitalTestRun>` — note `requestOptions` lives *inside* `opts`, and the poll knob is named `pollInterval`, matching `BatchesWaitForOptions` (`src/resources/batches.ts:15-21`).

- [ ] **Step 1: Write the failing tests**

Create `tests/resources/digitalTesting.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';
import type { DigitalTestRun } from '../../src/types/digitalTesting.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

function run(over: Partial<DigitalTestRun> = {}): DigitalTestRun {
  return {
    id: 'r1',
    workspaceId: 'w1',
    targetRef: 'acme/billing-bot',
    channel: 'chat',
    kind: 'freeform',
    status: 'pending',
    startedAt: '2026-08-12T00:00:00Z',
    ...over,
  };
}

describe('DigitalTestingResource', () => {
  it('create unwraps { message, run }', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { message: 'Digital test queued', run: run() } },
    ]);
    const c = client(fetch);
    const r = await c.digitalTesting.create({
      targetRef: 'acme/billing-bot',
      target: { transport: 'web-widget', url: 'https://example.com/support' },
    });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/digital-testing/runs');
    expect(r.id).toBe('r1');
  });

  it('get fetches one run', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: run({ status: 'completed' }) }]);
    const c = client(fetch);
    const r = await c.digitalTesting.get('r1');
    expect(calls[0].url).toContain('/digital-testing/runs/r1');
    expect(r.status).toBe('completed');
  });

  it('cancel POSTs to the cancel path', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: run({ status: 'cancelled' }) }]);
    const c = client(fetch);
    const r = await c.digitalTesting.cancel('r1');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/digital-testing/runs/r1/cancel');
    expect(r.status).toBe('cancelled');
  });

  it('list sends cursor and follows nextCursor across pages', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runs: [run({ id: 'r1' })], nextCursor: 'c2' } },
      { body: { runs: [run({ id: 'r2' })] } },
    ]);
    const c = client(fetch);
    const seen: string[] = [];
    for await (const r of c.digitalTesting.list({ targetRef: 'acme/billing-bot' })) {
      seen.push(r.id);
    }
    expect(seen).toEqual(['r1', 'r2']);
    expect(calls[0].url).toContain('targetRef=acme%2Fbilling-bot');
    expect(calls[1].url).toContain('cursor=c2');
  });

  it('listPage maps runs and nextCursor onto the Page shape', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { runs: [run()], nextCursor: 'c2' } },
    ]);
    const c = client(fetch);
    const page = await c.digitalTesting.listPage();
    expect(page.items).toHaveLength(1);
    expect(page.nextToken).toBe('c2');
  });

  it('waitForRun resolves on completed even when the verdict is fail', async () => {
    const { fetch } = makeQueuedFetch([
      { body: run({ status: 'completed', outcome: 'fail' }) },
    ]);
    const c = client(fetch);
    const r = await c.digitalTesting.waitForRun('r1', { pollInterval: 1 });
    expect(r.status).toBe('completed');
    expect(r.outcome).toBe('fail');
  });

  it('waitForRun resolves on cancelled', async () => {
    const { fetch } = makeQueuedFetch([{ body: run({ status: 'cancelled' }) }]);
    const c = client(fetch);
    const r = await c.digitalTesting.waitForRun('r1', { pollInterval: 1 });
    expect(r.status).toBe('cancelled');
  });

  it('waitForRun resolves on failed and preserves failureReason', async () => {
    const { fetch } = makeQueuedFetch([
      { body: run({ status: 'failed', failureReason: 'transport timeout' }) },
    ]);
    const c = client(fetch);
    const r = await c.digitalTesting.waitForRun('r1', { pollInterval: 1 });
    expect(r.status).toBe('failed');
    expect(r.failureReason).toBe('transport timeout');
  });

  it('waitForRun throws NopaqueTimeoutError when the run never settles', async () => {
    const { fetch } = makeQueuedFetch(
      Array.from({ length: 50 }, () => ({ body: run({ status: 'running' }) })),
    );
    const c = client(fetch);
    await expect(
      c.digitalTesting.waitForRun('r1', { timeout: 30, pollInterval: 10 }),
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run tests/resources/digitalTesting.test.ts`
Expected: FAIL — `c.digitalTesting` is undefined.

- [ ] **Step 3: Implement the resource**

Create `src/resources/digitalTesting.ts`:

```ts
import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateDigitalTestRunRequest,
  DigitalTestRun,
  DigitalTestRunListParams,
} from '../types/digitalTesting.js';

const TERMINAL: ReadonlySet<string> = new Set(['completed', 'failed', 'cancelled']);

/** Mirrors `BatchesWaitForOptions` (`src/resources/batches.ts:15-21`). */
export interface DigitalTestingWaitForOptions {
  timeout?: number;
  pollInterval?: number;
  intervalCap?: number;
  onUpdate?: (run: DigitalTestRun) => void;
  requestOptions?: RequestOptions;
}

/**
 * Digital (chat channel) test runs.
 *
 * @beta Access is limited to beta workspaces during the beta period.
 */
export class DigitalTestingResource extends Resource {
  /**
   * Queue a digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async create(
    body: CreateDigitalTestRunRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestRun> {
    // POST returns { message, run } — unwrap the run object.
    const raw = await this.transport.request<
      { message?: string; run?: DigitalTestRun } & DigitalTestRun
    >('POST', '/digital-testing/runs', { body, requestOptions });
    return raw.run ?? raw;
  }

  /**
   * Paginated list of digital test runs, newest first.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  list(
    params: DigitalTestRunListParams = {},
    requestOptions?: RequestOptions,
  ): Paginator<DigitalTestRun> {
    return new Paginator<DigitalTestRun>({
      fetchPage: async (p) => {
        const { nextToken, cursor, ...rest } = p as DigitalTestRunListParams;
        // Server returns { runs: [...], nextCursor? } rather than { items, nextToken }.
        const raw = await this.transport.request<{
          runs?: DigitalTestRun[];
          items?: DigitalTestRun[];
          nextCursor?: string | null;
          nextToken?: string | null;
        }>('GET', '/digital-testing/runs', {
          params: { ...rest, cursor: cursor ?? nextToken },
          requestOptions,
        });
        return {
          items: raw.runs ?? raw.items ?? [],
          nextToken: raw.nextCursor ?? raw.nextToken ?? null,
        };
      },
      params: { ...params },
    });
  }

  /**
   * One page of digital test runs.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async listPage(
    params: DigitalTestRunListParams = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<DigitalTestRun>> {
    const { nextToken, cursor, ...rest } = params;
    const raw = await this.transport.request<{
      runs?: DigitalTestRun[];
      items?: DigitalTestRun[];
      nextCursor?: string | null;
      nextToken?: string | null;
    }>('GET', '/digital-testing/runs', {
      params: { ...rest, cursor: cursor ?? nextToken },
      requestOptions,
    });
    return new Page(raw.runs ?? raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  /**
   * Get one digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async get(runId: string, requestOptions?: RequestOptions): Promise<DigitalTestRun> {
    return await this.transport.request('GET', `/digital-testing/runs/${runId}`, {
      requestOptions,
    });
  }

  /**
   * Cancel a digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async cancel(runId: string, requestOptions?: RequestOptions): Promise<DigitalTestRun> {
    return await this.transport.request('POST', `/digital-testing/runs/${runId}/cancel`, {
      requestOptions,
    });
  }

  /**
   * Poll until the run reaches a terminal state.
   *
   * Resolves on `completed`, `failed` and `cancelled` alike and returns the run.
   * A bot that behaved badly is `completed` with `outcome: 'fail'`, which is a
   * RESULT, not an error — this never throws on it. `failed` means the test could
   * not be delivered.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async waitForRun(
    runId: string,
    opts: DigitalTestingWaitForOptions = {},
  ): Promise<DigitalTestRun> {
    return await waitFor<DigitalTestRun>({
      fetch: () => this.get(runId, opts.requestOptions),
      isTerminal: (r) => TERMINAL.has(r.status),
      timeout: opts.timeout,
      initialInterval: opts.pollInterval,
      intervalCap: opts.intervalCap,
      onUpdate: opts.onUpdate,
    });
  }
}
```

- [ ] **Step 4: Wire it into the client**

In `src/client.ts`, add the import alongside the other resource imports, then the field and the constructor line, following the existing ordering:

```ts
  readonly digitalTesting: DigitalTestingResource;
```

```ts
    this.digitalTesting = new DigitalTestingResource(this.transport);
```

In `src/index.ts`, export the resource class alongside the others:

```ts
export { DigitalTestingResource } from './resources/digitalTesting.js';
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm vitest run tests/resources/digitalTesting.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/resources/digitalTesting.ts src/client.ts src/index.ts tests/resources/digitalTesting.test.ts
git commit -m "feat(digital-testing): add run resource with cursor pagination and waitForRun"
```

---

### Task 4: `digitalTestConfigs` resource

**Files:**
- Create: `src/resources/digitalTestConfigs.ts`
- Create: `tests/resources/digitalTestConfigs.test.ts`
- Modify: `src/client.ts`, `src/index.ts`

**Interfaces:**
- Consumes: types from Task 1; `DigitalTestRun` for the `launch` return.
- Produces:
  - `client.digitalTestConfigs.list(params?, requestOptions?): Paginator<DigitalTestConfig>`
  - `client.digitalTestConfigs.listPage(params?, requestOptions?): Promise<Page<DigitalTestConfig>>`
  - `client.digitalTestConfigs.create(body: CreateDigitalTestConfigRequest, requestOptions?): Promise<DigitalTestConfig>`
  - `client.digitalTestConfigs.get(configId, requestOptions?): Promise<DigitalTestConfig>`
  - `client.digitalTestConfigs.update(configId, body: UpdateDigitalTestConfigRequest, requestOptions?): Promise<DigitalTestConfig>`
  - `client.digitalTestConfigs.delete(configId, requestOptions?): Promise<void>`
  - `client.digitalTestConfigs.launch(configId, body?: LaunchDigitalTestConfigRequest, requestOptions?): Promise<DigitalTestRun>`

- [ ] **Step 1: Write the failing tests**

Create `tests/resources/digitalTestConfigs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';
import type { DigitalTestConfig } from '../../src/types/digitalTesting.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

function cfg(over: Partial<DigitalTestConfig> = {}): DigitalTestConfig {
  return {
    id: 'c1',
    workspaceId: 'w1',
    name: 'Billing bot smoke',
    targetRef: 'acme/billing-bot',
    target: { transport: 'web-widget', url: 'https://example.com/support' },
    sector: 'utilities',
    mission: 'check the bill',
    kind: 'freeform',
    createdAt: '2026-08-12T00:00:00Z',
    updatedAt: '2026-08-12T00:00:00Z',
    ...over,
  };
}

describe('DigitalTestConfigsResource', () => {
  it('create POSTs the config', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfg() }]);
    const c = client(fetch);
    const r = await c.digitalTestConfigs.create({
      name: 'Billing bot smoke',
      targetRef: 'acme/billing-bot',
      target: { transport: 'web-widget', url: 'https://example.com/support' },
    });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/digital-testing/configs');
    expect(r.id).toBe('c1');
  });

  it('get fetches one config', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfg() }]);
    const c = client(fetch);
    await c.digitalTestConfigs.get('c1');
    expect(calls[0].url).toContain('/digital-testing/configs/c1');
  });

  it('update PATCHes, not PUTs', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfg({ name: 'Renamed' }) }]);
    const c = client(fetch);
    const r = await c.digitalTestConfigs.update('c1', { name: 'Renamed' });
    expect(calls[0].init.method).toBe('PATCH');
    expect(r.name).toBe('Renamed');
  });

  it('delete DELETEs and returns nothing', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 204 }]);
    const c = client(fetch);
    await c.digitalTestConfigs.delete('c1');
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toContain('/digital-testing/configs/c1');
  });

  it('launch POSTs to the runs subpath and unwraps the run', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          message: 'Digital test queued',
          run: {
            id: 'r9',
            workspaceId: 'w1',
            targetRef: 'acme/billing-bot',
            channel: 'chat',
            kind: 'freeform',
            status: 'pending',
            startedAt: '2026-08-12T00:00:00Z',
          },
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.digitalTestConfigs.launch('c1', { samples: 3 });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/digital-testing/configs/c1/runs');
    expect(r.id).toBe('r9');
  });

  it('list follows nextCursor using the configs key', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { configs: [cfg({ id: 'c1' })], nextCursor: 'c2' } },
      { body: { configs: [cfg({ id: 'c2' })] } },
    ]);
    const c = client(fetch);
    const seen: string[] = [];
    for await (const item of c.digitalTestConfigs.list()) seen.push(item.id);
    expect(seen).toEqual(['c1', 'c2']);
    expect(calls[1].url).toContain('cursor=c2');
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run tests/resources/digitalTestConfigs.test.ts`
Expected: FAIL — `c.digitalTestConfigs` is undefined.

- [ ] **Step 3: Implement the resource**

Create `src/resources/digitalTestConfigs.ts`:

```ts
import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  CreateDigitalTestConfigRequest,
  DigitalTestConfig,
  DigitalTestConfigListParams,
  DigitalTestRun,
  LaunchDigitalTestConfigRequest,
  UpdateDigitalTestConfigRequest,
} from '../types/digitalTesting.js';

/**
 * Saved digital (chat channel) test configs.
 *
 * @beta Access is limited to beta workspaces during the beta period.
 */
export class DigitalTestConfigsResource extends Resource {
  /** @beta Access is limited to beta workspaces during the beta period. */
  list(
    params: DigitalTestConfigListParams = {},
    requestOptions?: RequestOptions,
  ): Paginator<DigitalTestConfig> {
    return new Paginator<DigitalTestConfig>({
      fetchPage: async (p) => {
        const { nextToken, cursor, ...rest } = p as DigitalTestConfigListParams;
        // Server returns { configs: [...], nextCursor? }.
        const raw = await this.transport.request<{
          configs?: DigitalTestConfig[];
          items?: DigitalTestConfig[];
          nextCursor?: string | null;
          nextToken?: string | null;
        }>('GET', '/digital-testing/configs', {
          params: { ...rest, cursor: cursor ?? nextToken },
          requestOptions,
        });
        return {
          items: raw.configs ?? raw.items ?? [],
          nextToken: raw.nextCursor ?? raw.nextToken ?? null,
        };
      },
      params: { ...params },
    });
  }

  /** @beta Access is limited to beta workspaces during the beta period. */
  async listPage(
    params: DigitalTestConfigListParams = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<DigitalTestConfig>> {
    const { nextToken, cursor, ...rest } = params;
    const raw = await this.transport.request<{
      configs?: DigitalTestConfig[];
      items?: DigitalTestConfig[];
      nextCursor?: string | null;
      nextToken?: string | null;
    }>('GET', '/digital-testing/configs', {
      params: { ...rest, cursor: cursor ?? nextToken },
      requestOptions,
    });
    return new Page(raw.configs ?? raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  /**
   * Save a digital test config. Per-kind rules are enforced at SAVE time, so a
   * config that could never run is rejected with 400 rather than stored.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async create(
    body: CreateDigitalTestConfigRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestConfig> {
    return await this.transport.request('POST', '/digital-testing/configs', {
      body,
      requestOptions,
    });
  }

  /** @beta Access is limited to beta workspaces during the beta period. */
  async get(configId: string, requestOptions?: RequestOptions): Promise<DigitalTestConfig> {
    return await this.transport.request('GET', `/digital-testing/configs/${configId}`, {
      requestOptions,
    });
  }

  /** @beta Access is limited to beta workspaces during the beta period. */
  async update(
    configId: string,
    body: UpdateDigitalTestConfigRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestConfig> {
    return await this.transport.request('PATCH', `/digital-testing/configs/${configId}`, {
      body,
      requestOptions,
    });
  }

  /** @beta Access is limited to beta workspaces during the beta period. */
  async delete(configId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/digital-testing/configs/${configId}`, {
      requestOptions,
    });
  }

  /**
   * Launch a run from a saved config. `target` and `targetRef` must be
   * overridden together — a half-override is a 400.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async launch(
    configId: string,
    body: LaunchDigitalTestConfigRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestRun> {
    const raw = await this.transport.request<
      { message?: string; run?: DigitalTestRun } & DigitalTestRun
    >('POST', `/digital-testing/configs/${configId}/runs`, { body, requestOptions });
    return raw.run ?? raw;
  }
}
```

- [ ] **Step 4: Wire it into the client**

In `src/client.ts`:

```ts
  readonly digitalTestConfigs: DigitalTestConfigsResource;
```

```ts
    this.digitalTestConfigs = new DigitalTestConfigsResource(this.transport);
```

In `src/index.ts`:

```ts
export { DigitalTestConfigsResource } from './resources/digitalTestConfigs.js';
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm vitest run tests/resources/digitalTestConfigs.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/resources/digitalTestConfigs.ts src/client.ts src/index.ts tests/resources/digitalTestConfigs.test.ts
git commit -m "feat(digital-testing): add saved config resource"
```

---

### Task 5: `digitalCompliance` resource

**Files:**
- Create: `src/resources/digitalCompliance.ts`
- Create: `tests/resources/digitalCompliance.test.ts`
- Modify: `src/client.ts`, `src/index.ts`

**Interfaces:**
- Consumes: `DigitalComplianceAuditSummary` from Task 1.
- Produces:
  - `client.digitalCompliance.listAudits(requestOptions?): Promise<DigitalComplianceAuditSummary[]>`
  - `client.digitalCompliance.getReport(targetRef: string, requestOptions?): Promise<unknown>`

The report body is not a named schema in the OpenAPI document. Return the parsed
response as-is rather than inventing a type that could drift from the server.

- [ ] **Step 1: Write the failing tests**

Create `tests/resources/digitalCompliance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('DigitalComplianceResource', () => {
  it('listAudits returns the audits array', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          audits: [
            {
              targetRef: 'acme/billing-bot',
              lastRunAt: '2026-08-12T00:00:00Z',
              runCount: 4,
              catalogueTestIds: ['M-001'],
            },
          ],
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.digitalCompliance.listAudits();
    expect(calls[0].url).toContain('/digital-testing/compliance-audits');
    expect(r).toHaveLength(1);
    expect(r[0].runCount).toBe(4);
  });

  it('getReport sends targetRef as a QUERY param, never a path segment', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { targetRef: 'acme/billing-bot' } }]);
    const c = client(fetch);
    await c.digitalCompliance.getReport('acme/billing-bot');
    // A targetRef contains slashes, so it cannot be a path segment.
    expect(calls[0].url).toContain('/digital-testing/compliance-audits/report');
    expect(calls[0].url).toContain('targetRef=acme%2Fbilling-bot');
    expect(calls[0].url).not.toContain('report/acme');
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run tests/resources/digitalCompliance.test.ts`
Expected: FAIL — `c.digitalCompliance` is undefined.

- [ ] **Step 3: Implement the resource**

Create `src/resources/digitalCompliance.ts`:

```ts
import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import type { DigitalComplianceAuditSummary } from '../types/digitalTesting.js';

/**
 * Digital (chat channel) compliance audits.
 *
 * @beta Access is limited to beta workspaces during the beta period.
 */
export class DigitalComplianceResource extends Resource {
  /**
   * List digital compliance audits, one entry per target.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async listAudits(requestOptions?: RequestOptions): Promise<DigitalComplianceAuditSummary[]> {
    const raw = await this.transport.request<{ audits?: DigitalComplianceAuditSummary[] }>(
      'GET',
      '/digital-testing/compliance-audits',
      { requestOptions },
    );
    return raw.audits ?? [];
  }

  /**
   * Compliance report for one digital target.
   *
   * `targetRef` goes in the QUERY STRING, not the path: a targetRef contains
   * slashes (`acme/billing-bot`) and a single path segment cannot hold one. The
   * API made the same choice for the same reason.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async getReport(targetRef: string, requestOptions?: RequestOptions): Promise<unknown> {
    return await this.transport.request('GET', '/digital-testing/compliance-audits/report', {
      params: { targetRef },
      requestOptions,
    });
  }
}
```

- [ ] **Step 4: Wire it into the client**

In `src/client.ts`:

```ts
  readonly digitalCompliance: DigitalComplianceResource;
```

```ts
    this.digitalCompliance = new DigitalComplianceResource(this.transport);
```

In `src/index.ts`:

```ts
export { DigitalComplianceResource } from './resources/digitalCompliance.js';
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm vitest run tests/resources/digitalCompliance.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/resources/digitalCompliance.ts src/client.ts src/index.ts tests/resources/digitalCompliance.test.ts
git commit -m "feat(digital-testing): add compliance audit resource"
```

---

### Task 6: Release 0.4.0

**Files:**
- Modify: `package.json`, `CHANGELOG.md`, `README.md`

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces: a releasable 0.4.0.

- [ ] **Step 1: Run the full gate**

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
node ./tests/smoke/verify-exports.mjs
```

Expected: all five pass. The exports check matters most here — Tasks 3-5 each
changed `src/index.ts`, and this is what proves the CJS path still resolves.

- [ ] **Step 2: Bump the version**

In `package.json`, change `"version": "0.3.0"` to `"version": "0.4.0"`.

- [ ] **Step 3: Add the changelog entry**

At the top of `CHANGELOG.md`, following the existing entry format:

```markdown
## 0.4.0

### Added

- Digital (chat channel) testing, in beta. Access is limited to beta workspaces
  during the beta period.
  - `client.digitalTesting` — create, list, get, cancel and wait for digital test runs.
  - `client.digitalTestConfigs` — save, update, delete and launch reusable digital test configs.
  - `client.digitalCompliance` — list digital compliance audits and fetch a per-target report.
- `client.testing.listVoices()` — the operator-enabled voices a mission test may
  use, and which is the default.
```

- [ ] **Step 4: Document the resources in the README**

Add a section to `README.md` matching the surrounding style. It needs a heading
reading `### Digital testing (beta)`, the sentence "Access is limited to beta
workspaces during the beta period.", and a fenced `ts` block containing exactly
this example:

~~~ts
const run = await client.digitalTesting.create({
  targetRef: 'acme/billing-bot',
  target: { transport: 'web-widget', url: 'https://example.com/support' },
  kind: 'freeform',
  acceptance: 'The bot states the outstanding balance.',
});

const finished = await client.digitalTesting.waitForRun(run.id);
// `completed` with outcome 'fail' is a RESULT, not an error.
console.log(finished.status, finished.outcome, finished.passRate);
~~~

- [ ] **Step 5: Re-run the gate and commit**

```bash
pnpm lint && pnpm type-check && pnpm test && pnpm build
git add package.json CHANGELOG.md README.md
git commit -m "chore(release): 0.4.0"
```

- [ ] **Step 6: Open the PR**

```bash
git rebase origin/main
git log --oneline origin/main..HEAD   # verify single-purpose
git push -u origin feat/digital-testing-coverage
gh pr create --base main --title "feat: digital testing coverage (0.4.0)" --body "$(cat <<'EOF'
Adds the 12 `/digital-testing/*` operations plus `GET /testing/voices`.

Three new flat resources — `digitalTesting`, `digitalTestConfigs`,
`digitalCompliance` — following the existing one-module-per-domain layout.
Beta status is communicated via `@beta` JSDoc rather than a `client.beta.*`
namespace, so promoting to GA is not a breaking rename.

Three things worth a reviewer's attention:

- Cursor pagination is bridged inside each `fetchPage` (send `cursor ?? nextToken`,
  read `nextCursor ?? nextToken`), copying `TestingRunsResource.list`. The shared
  paginator is untouched.
- `getReport` sends `targetRef` as a query param. A targetRef contains slashes,
  so a path segment cannot hold one. Pinned by a test.
- `waitForRun` resolves on `completed`, `failed` and `cancelled` alike. A
  badly-behaved bot is `completed` with `outcome: 'fail'`, which is a result, not
  an error, and is deliberately not thrown on.

Design: `docs/superpowers/specs/2026-08-12-digital-testing-sdk-coverage-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Companion work

- **Python SDK:** same 13 operations, sync and async. Separate plan, `docs/superpowers/plans/2026-08-12-digital-testing-python-sdk.md`.
- **OpenAPI version bump:** `api/openapi/openapi.yaml` `version: "0.3.0"` -> `"0.4.0"`. Its own one-line PR against `nopaque/api`.
