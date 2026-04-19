import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('LoadTestingResource', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'lt_1', name: 'P', configId: 'c', concurrency: 10, totalCalls: 100, status: 'created' } },
    ]);
    const c = client(fetch);
    const lt = await c.loadTesting.create({
      name: 'P',
      configId: 'c',
      concurrency: 10,
      totalCalls: 100,
    });
    expect(lt.id).toBe('lt_1');
    expect(calls[0].url).toContain('/testing/load-tests');
  });

  it('list / get / update / delete', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { items: [{ id: 'lt_1', name: 'A', configId: 'c', concurrency: 1, totalCalls: 10, status: 'created' }], nextToken: null } },
      { body: { id: 'lt_1', name: 'A', configId: 'c', concurrency: 1, totalCalls: 10, status: 'created' } },
      { body: { id: 'lt_1', name: 'A', configId: 'c', concurrency: 2, totalCalls: 10, status: 'created' } },
      { body: { message: 'ok' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const x of c.loadTesting.list()) out.push(x);
    expect(out).toHaveLength(1);
    await c.loadTesting.get('lt_1');
    await c.loadTesting.update('lt_1', { concurrency: 2 });
    await c.loadTesting.delete('lt_1');
    expect(calls[2].init.method).toBe('PUT');
    expect(calls[3].init.method).toBe('DELETE');
  });

  it('estimate', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { estimatedMinutes: 15.5, estimatedCost: '$4.65', concurrency: 10, totalCalls: 100 } },
    ]);
    const c = client(fetch);
    const est = await c.loadTesting.estimate({ configId: 'c', concurrency: 10, totalCalls: 100 });
    expect(est.estimatedCost).toBe('$4.65');
    expect(calls[0].url).toContain('/testing/load-tests/estimate');
  });

  it('start / abort / status', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'lt_1', runId: 'ltrun_1', status: 'running' } },
      { body: { id: 'lt_1', status: 'aborted' } },
      { body: { id: 'lt_1', status: 'running', progress: { completedCalls: 10, totalCalls: 100 } } },
    ]);
    const c = client(fetch);
    const st = await c.loadTesting.start('lt_1');
    expect(st.runId).toBe('ltrun_1');
    const ab = await c.loadTesting.abort('lt_1');
    expect(ab.status).toBe('aborted');
    const stat = await c.loadTesting.status('lt_1');
    expect(stat.progress.completedCalls).toBe(10);
    expect(calls[0].url).toContain('/testing/load-tests/lt_1/start');
    expect(calls[1].url).toContain('/testing/load-tests/lt_1/abort');
    expect(calls[2].url).toContain('/testing/load-tests/lt_1/status');
  });

  it('listRuns', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { items: [{ runId: 'ltrun_1', loadTestId: 'lt_1', status: 'completed' }], nextToken: null } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.loadTesting.listRuns()) out.push(r);
    expect(out[0].runId).toBe('ltrun_1');
    expect(calls[0].url).toContain('/testing/load-tests/runs');
  });

  it('waitForComplete terminal', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'lt_1', status: 'running', progress: { completedCalls: 1, totalCalls: 10 } } },
      { body: { id: 'lt_1', status: 'completed', progress: { completedCalls: 10, totalCalls: 10 } } },
    ]);
    const c = client(fetch);
    const r = await c.loadTesting.waitForComplete('lt_1', { timeout: 5000, pollInterval: 1 });
    expect(r.status).toBe('completed');
  });

  it('waitForComplete times out', async () => {
    const { fetch } = makeQueuedFetch(
      Array.from({ length: 50 }, () => ({
        body: { id: 'lt_1', status: 'running', progress: { completedCalls: 0, totalCalls: 10 } },
      }))
    );
    const c = client(fetch);
    await expect(
      c.loadTesting.waitForComplete('lt_1', { timeout: 30, pollInterval: 10 })
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });
});
