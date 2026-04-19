import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('BatchesResource', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          id: 'batch_1',
          name: 'B',
          configId: 'cfg_1',
          datasetId: 'ds_1',
          status: 'created',
        },
      },
    ]);
    const c = client(fetch);
    const b = await c.batches.create({ name: 'B', configId: 'cfg_1', datasetId: 'ds_1' });
    expect(b.id).toBe('batch_1');
    expect(calls[0].url).toContain('/testing/batches');
  });

  it('list / get / update / delete', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { batches: [{ id: 'batch_1', name: 'B', configId: 'c', datasetId: 'd', status: 'created' }] } },
      { body: { id: 'batch_1', name: 'B', configId: 'c', datasetId: 'd', status: 'created' } },
      { body: { id: 'batch_1', name: 'C', configId: 'c', datasetId: 'd', status: 'created' } },
      { body: { message: 'ok' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const b of c.batches.list()) out.push(b);
    expect(out).toHaveLength(1);
    await c.batches.get('batch_1');
    await c.batches.update('batch_1', { name: 'C' });
    await c.batches.delete('batch_1');
    expect(calls[2].init.method).toBe('PUT');
    expect(calls[3].init.method).toBe('DELETE');
  });

  it('run starts a batch run', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'brun_1', batchId: 'batch_1', status: 'running' } },
    ]);
    const c = client(fetch);
    const r = await c.batches.run('batch_1');
    expect(r.id).toBe('brun_1');
    expect(calls[0].url).toContain('/testing/batches/batch_1/run');
    expect(calls[0].init.method).toBe('POST');
  });

  it('runs paginates per batch', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runs: [{ id: 'brun_1', status: 'completed' }] } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.batches.runs('batch_1')) out.push(r);
    expect(out[0].id).toBe('brun_1');
    expect(calls[0].url).toContain('/testing/batches/batch_1/runs');
  });

  it('listRuns paginates global', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          runs: [{ id: 'brun_1', batchId: 'batch_1', status: 'completed' }],
        },
      },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.batches.listRuns()) out.push(r);
    expect(out[0].id).toBe('brun_1');
    expect(calls[0].url).toContain('/testing/batch-runs');
  });

  it('getRun', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          id: 'brun_1',
          batchId: 'batch_1',
          status: 'completed',
          passRate: 0.92,
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.batches.getRun('brun_1');
    expect(r.passRate).toBe(0.92);
  });

  it('waitForRun returns on terminal', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'brun_1', batchId: 'batch_1', status: 'running' } },
      { body: { id: 'brun_1', batchId: 'batch_1', status: 'completed' } },
    ]);
    const c = client(fetch);
    const r = await c.batches.waitForRun('brun_1', { timeout: 5000, pollInterval: 1 });
    expect(r.status).toBe('completed');
  });

  it('waitForRun times out', async () => {
    const { fetch } = makeQueuedFetch(
      Array.from({ length: 50 }, () => ({
        body: { id: 'brun_1', batchId: 'batch_1', status: 'running' },
      }))
    );
    const c = client(fetch);
    await expect(
      c.batches.waitForRun('brun_1', { timeout: 30, pollInterval: 10 })
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });
});
