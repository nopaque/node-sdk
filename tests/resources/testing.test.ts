import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('TestingResource configs', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'cfg_1', name: 'F', phoneNumber: '+441', steps: [] } },
    ]);
    const c = client(fetch);
    const cfg = await c.testing.configs.create({
      name: 'F',
      phoneNumber: '+441',
      steps: [],
    });
    expect(cfg.id).toBe('cfg_1');
    expect(calls[0].url).toContain('/testing/configs');
  });

  it('list', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { items: [{ id: 'cfg_1', name: 'A', phoneNumber: '+1', steps: [] }], nextToken: null } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const x of c.testing.configs.list()) out.push(x);
    expect(out).toHaveLength(1);
  });

  it('get / update / delete', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'cfg_1', name: 'A', phoneNumber: '+1', steps: [] } },
      { body: { id: 'cfg_1', name: 'B', phoneNumber: '+1', steps: [] } },
      { body: { message: 'ok' } },
    ]);
    const c = client(fetch);
    await c.testing.configs.get('cfg_1');
    await c.testing.configs.update('cfg_1', { name: 'B' });
    await c.testing.configs.delete('cfg_1');
    expect(calls[1].init.method).toBe('PUT');
    expect(calls[2].init.method).toBe('DELETE');
  });
});

describe('TestingResource jobs', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'job_1', configId: 'cfg_1', status: 'created' } },
    ]);
    const c = client(fetch);
    const job = await c.testing.jobs.create({ configId: 'cfg_1' });
    expect(job.id).toBe('job_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ configId: 'cfg_1' });
  });

  it('list / get / delete', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { items: [{ id: 'job_1', configId: 'cfg_1', status: 'completed' }], nextToken: null } },
      { body: { id: 'job_1', configId: 'cfg_1', status: 'completed' } },
      { body: { message: 'ok' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const x of c.testing.jobs.list()) out.push(x);
    expect(out).toHaveLength(1);
    await c.testing.jobs.get('job_1');
    await c.testing.jobs.delete('job_1');
    expect(calls[2].init.method).toBe('DELETE');
  });
});

describe('TestingResource runs', () => {
  it('create from jobId', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runId: 'run_1', jobId: 'job_1', status: 'running' } },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.create({ jobId: 'job_1' });
    expect(run.runId).toBe('run_1');
    expect(calls[0].url).toContain('/testing/runs');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ jobId: 'job_1' });
  });

  it('create from testConfigId (ad-hoc)', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runId: 'run_2', status: 'running' } },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.create({ testConfigId: 'cfg_1' });
    expect(run.runId).toBe('run_2');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ testConfigId: 'cfg_1' });
  });

  it('list / get', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { items: [{ runId: 'run_1', jobId: 'job_1', status: 'completed' }], nextToken: null } },
      { body: { runId: 'run_1', jobId: 'job_1', status: 'completed', result: 'pass' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.testing.runs.list()) out.push(r);
    expect(out[0].runId).toBe('run_1');
    const r = await c.testing.runs.get('run_1');
    expect(r.result).toBe('pass');
  });

  it('waitForRun returns on terminal', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { runId: 'run_1', jobId: 'job_1', status: 'running' } },
      { body: { runId: 'run_1', jobId: 'job_1', status: 'completed' } },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.waitForRun('run_1', {
      timeout: 5000,
      pollInterval: 1,
    });
    expect(run.status).toBe('completed');
  });

  it('waitForRun times out', async () => {
    const { fetch } = makeQueuedFetch(
      Array.from({ length: 50 }, () => ({
        body: { runId: 'run_1', jobId: 'job_1', status: 'running' },
      }))
    );
    const c = client(fetch);
    await expect(
      c.testing.runs.waitForRun('run_1', { timeout: 30, pollInterval: 10 })
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });
});
