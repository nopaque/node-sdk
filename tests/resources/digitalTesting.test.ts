import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueAPIError, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';
import type {
  CreateDigitalTestRunRequest,
  DigitalTestRun,
} from '../../src/types/digitalTesting.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

// Fixtures are transcribed from the OpenAPI schemas' documented shapes and
// examples, NOT from the SDK's own types - the types were wrong and a fixture
// built from them would have kept the defect invisible.
function run(over: Partial<DigitalTestRun> = {}): DigitalTestRun {
  return {
    id: 'r1',
    workspaceId: 'w1',
    targetRef: 'acme/billing-bot',
    channel: 'chat',
    kind: 'freeform',
    sector: 'utilities',
    mission: 'Pay my bill',
    status: 'pending',
    startedAt: '2026-08-12T00:00:00Z',
    ...over,
  };
}

const createBody: CreateDigitalTestRunRequest = {
  targetRef: 'acme/billing-bot',
  target: { transport: 'web-widget', url: 'https://example.com/support' },
  sector: 'utilities',
  mission: 'Pay my bill',
};

describe('DigitalTestingResource', () => {
  it('create unwraps { message, run }', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { message: 'Digital test queued', run: run() } },
    ]);
    const c = client(fetch);
    const r = await c.digitalTesting.create(createBody);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/digital-testing/runs');
    expect(r.id).toBe('r1');
  });

  it('accepts a full `standard` body: steps with matchers, profileItemId sends, and profile data', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { message: 'Digital test queued', run: run({ kind: 'standard' }) } },
    ]);
    const c = client(fetch);
    const body: CreateDigitalTestRunRequest = {
      targetRef: 'acme/billing-bot',
      target: {
        transport: 'http-json',
        endpoint: 'https://bot.example.com/v1/chat',
        openaiCompatible: true,
        authRef: 'acme-bot-key',
      },
      sector: 'utilities',
      mission: 'Pay my bill',
      kind: 'standard',
      maxTurns: 12,
      profile: {
        dataItems: { accountNumber: { label: 'Account number', value: '12345678' } },
      },
      steps: [
        { id: 's1', name: 'greeting', type: 'send', text: 'Hello' },
        { type: 'send', profileItemId: 'accountNumber' },
        {
          id: 's3',
          type: 'expect',
          expected: 'Your balance is',
          matcher: 'contains',
          threshold: 80,
          timeoutSecs: 30,
        },
        { type: 'wait' },
        { type: 'end' },
      ],
    };
    await c.digitalTesting.create(body);
    const sent = JSON.parse(String(calls[0].init.body)) as CreateDigitalTestRunRequest;
    expect(sent.sector).toBe('utilities');
    expect(sent.mission).toBe('Pay my bill');
    expect(sent.steps).toHaveLength(5);
    expect(sent.profile?.dataItems?.accountNumber?.value).toBe('12345678');
  });

  it('accepts probes on a judged kind', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { message: 'Digital test queued', run: run({ kind: 'compliance' }) } },
    ]);
    const c = client(fetch);
    await c.digitalTesting.create({
      ...createBody,
      kind: 'compliance',
      catalogueTestId: 'M-001',
      probes: ['Are you a real person?'],
    });
    const sent = JSON.parse(String(calls[0].init.body)) as CreateDigitalTestRunRequest;
    expect(sent.probes).toEqual(['Are you a real person?']);
    expect(sent.catalogueTestId).toBe('M-001');
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

  it('list advances past a caller-supplied cursor rather than repeating page one', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runs: [run({ id: 'r1' })], nextCursor: 'c2' } },
      { body: { runs: [run({ id: 'r2' })], nextCursor: 'c3' } },
      { body: { runs: [run({ id: 'r3' })] } },
    ]);
    const c = client(fetch);
    const seen: string[] = [];
    for await (const r of c.digitalTesting.list({ cursor: 'c1' })) seen.push(r.id);
    expect(seen).toEqual(['r1', 'r2', 'r3']);
    expect(calls.map((call) => new URL(call.url).searchParams.get('cursor'))).toEqual([
      'c1',
      'c2',
      'c3',
    ]);
  });

  it('surfaces the samples envelope with the field names the API actually returns', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: run({
          status: 'completed',
          outcome: 'fail',
          samplesRequested: 3,
          samplesJudged: 3,
          passed: 1,
          failed: 2,
          transportErrors: 0,
          passRate: 0.3333,
          samples: [
            {
              outcome: 'fail',
              stepsRun: 2,
              stepsTotal: 3,
              transcript: [
                { role: 'customer', text: 'hello', at: '2026-08-12T00:00:00Z' },
                { role: 'bot', text: 'hi', at: '2026-08-12T00:00:01Z' },
              ],
              reasoning: 'The bot never stated the outstanding balance.',
              passEvidence: [{ condition: 'Greeted the customer', reason: 'bot: hi' }],
              failEvidence: [
                {
                  condition: 'Stated the outstanding balance',
                  reason: 'bot: I can help with that',
                },
              ],
              stepResults: [
                {
                  stepId: 's1',
                  name: 'greeting',
                  actionType: 'expect',
                  actionValue: 'Hello',
                  expectedTranscript: 'Hello',
                  actualTranscript: 'Hi',
                  similarity: 62,
                  threshold: 100,
                  outcome: 'fail',
                  duration: 1.2,
                },
              ],
            },
          ],
        }),
      },
    ]);
    const c = client(fetch);
    const r = await c.digitalTesting.get('r1');
    const sample = r.samples?.[0];
    expect(sample?.reasoning).toBe('The bot never stated the outstanding balance.');
    expect(sample?.stepsRun).toBe(2);
    // A list of turns, not a string, and split pass/fail evidence — the shapes
    // the API actually returns, which the OpenAPI document gets wrong.
    expect(sample?.transcript?.map((turn) => turn.role)).toEqual(['customer', 'bot']);
    expect(sample?.transcript?.[1]?.text).toBe('hi');
    expect(sample?.passEvidence?.[0]?.condition).toBe('Greeted the customer');
    expect(sample?.failEvidence?.[0]?.reason).toBe('bot: I can help with that');
    const step = sample?.stepResults?.[0];
    expect(step?.stepId).toBe('s1');
    expect(step?.expectedTranscript).toBe('Hello');
    expect(step?.actualTranscript).toBe('Hi');
    expect(step?.outcome).toBe('fail');
  });

  it('raises a typed error when the workspace lacks the beta entitlement (402)', async () => {
    const { fetch } = makeQueuedFetch([
      {
        status: 402,
        // The documented 402 envelope is `BillingError` (`error` + `errorCode`),
        // not the plain `Error` schema used by 400/401/404.
        body: {
          error: 'Insufficient s2stest minutes for this workspace.',
          errorCode: 'FREE_TIER_EXHAUSTED',
        },
      },
    ]);
    const c = client(fetch);
    const err = await c.digitalTesting.create(createBody).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NopaqueAPIError);
    expect((err as NopaqueAPIError).status).toBe(402);
    expect((err as NopaqueAPIError).message).toContain('Insufficient s2stest minutes');
    // 402 has no dedicated subclass; callers branch on `status`.
    expect((err as NopaqueAPIError).constructor.name).toBe('NopaqueAPIError');
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
