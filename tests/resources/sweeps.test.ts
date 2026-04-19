import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('SweepsResource', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'sweep_1', name: 'S', configId: 'c', status: 'created' } },
    ]);
    const c = client(fetch);
    const s = await c.sweeps.create({
      name: 'S',
      configId: 'c',
      parameters: { dtmfOptions: ['1', '2'] },
    });
    expect(s.id).toBe('sweep_1');
    expect(calls[0].url).toContain('/testing/sweeps');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      name: 'S',
      configId: 'c',
      parameters: { dtmfOptions: ['1', '2'] },
    });
  });

  it('list / get / update / delete', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { sweeps: [{ id: 'sweep_1', name: 'A', configId: 'c', status: 'created' }] } },
      { body: { id: 'sweep_1', name: 'A', configId: 'c', status: 'created' } },
      { body: { id: 'sweep_1', name: 'B', configId: 'c', status: 'created' } },
      { body: { message: 'ok' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const s of c.sweeps.list()) out.push(s);
    expect(out).toHaveLength(1);
    await c.sweeps.get('sweep_1');
    await c.sweeps.update('sweep_1', { name: 'B' });
    await c.sweeps.delete('sweep_1');
    expect(calls[2].init.method).toBe('PUT');
    expect(calls[3].init.method).toBe('DELETE');
  });

  it('run', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'srun_1', sweepId: 'sweep_1', status: 'running' } },
    ]);
    const c = client(fetch);
    const r = await c.sweeps.run('sweep_1');
    expect(r.id).toBe('srun_1');
    expect(calls[0].url).toContain('/testing/sweeps/sweep_1/run');
  });

  it('runs', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runs: [{ id: 'srun_1', status: 'completed' }] } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.sweeps.runs('sweep_1')) out.push(r);
    expect(out[0].id).toBe('srun_1');
    expect(calls[0].url).toContain('/testing/sweeps/sweep_1/runs');
  });

  it('listRuns + getRun', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { runs: [{ id: 'srun_1', sweepId: 'sweep_1', status: 'completed' }] } },
      {
        body: {
          id: 'srun_1',
          sweepId: 'sweep_1',
          status: 'completed',
          results: [{ variation: { dtmfOption: '1' }, result: 'pass' }],
        },
      },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.sweeps.listRuns()) out.push(r);
    expect(out[0].id).toBe('srun_1');
    const r = await c.sweeps.getRun('srun_1');
    expect(r.results?.[0].result).toBe('pass');
  });

  it('waitForRun returns on terminal', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'srun_1', sweepId: 'sweep_1', status: 'running' } },
      { body: { id: 'srun_1', sweepId: 'sweep_1', status: 'completed' } },
    ]);
    const c = client(fetch);
    const r = await c.sweeps.waitForRun('srun_1', { timeout: 5000, pollInterval: 1 });
    expect(r.status).toBe('completed');
  });

  it('waitForRun times out', async () => {
    const { fetch } = makeQueuedFetch(
      Array.from({ length: 50 }, () => ({
        body: { id: 'srun_1', sweepId: 'sweep_1', status: 'running' },
      }))
    );
    const c = client(fetch);
    await expect(
      c.sweeps.waitForRun('srun_1', { timeout: 30, pollInterval: 10 })
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });
});
