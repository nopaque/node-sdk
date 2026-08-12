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
