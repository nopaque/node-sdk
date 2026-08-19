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
    // Server returns { configs: [...] }, not { items }.
    const { fetch } = makeQueuedFetch([
      { body: { configs: [{ id: 'cfg_1', name: 'A', phoneNumber: '+1', steps: [] }] } },
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
      // Server returns { jobs: [...] }, not { items }.
      { body: { jobs: [{ id: 'job_1', configId: 'cfg_1', status: 'completed' }] } },
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
  it('create from jobId unwraps {message, run}', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          message: 'Test run started',
          run: { id: 'run_1', jobId: 'job_1', status: 'pending' },
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.create({ jobId: 'job_1' });
    expect(run.id).toBe('run_1');
    expect(run.status).toBe('pending');
    expect(calls[0].url).toContain('/testing/runs');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ jobId: 'job_1' });
  });

  it('create from testConfigId (ad-hoc) unwraps {message, run}', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          message: 'Test run started',
          run: { id: 'run_2', testConfigId: 'cfg_1', status: 'pending' },
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.create({ testConfigId: 'cfg_1' });
    expect(run.id).toBe('run_2');
    expect(run.testConfigId).toBe('cfg_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ testConfigId: 'cfg_1' });
  });

  it('list / get', async () => {
    // Server returns { runs: [...] }, not { items }.
    const { fetch } = makeQueuedFetch([
      { body: { runs: [{ id: 'run_1', jobId: 'job_1', status: 'completed' }] } },
      { body: { id: 'run_1', jobId: 'job_1', status: 'completed', outcome: 'PASS' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.testing.runs.list()) out.push(r);
    expect(out[0].id).toBe('run_1');
    const r = await c.testing.runs.get('run_1');
    // The API sends `outcome` (uppercase), never `result`.
    expect(r.outcome).toBe('PASS');
  });

  it('list sends filters and follows nextCursor', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          runs: [{ id: 'run_1', workspaceId: 'w', runType: 'mission', status: 'completed', outcome: 'PASS', startedAt: '' }],
          nextCursor: 'C2',
        },
      },
      { body: { runs: [{ id: 'run_2', workspaceId: 'w', runType: 'mission', status: 'running', startedAt: '' }] } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.testing.runs.list({ runType: 'mission', outcome: 'PASS' })) out.push(r);
    expect(out.map((r) => r.id)).toEqual(['run_1', 'run_2']);
    expect(calls[0].url).toContain('runType=mission');
    expect(calls[0].url).toContain('outcome=PASS');
    expect(calls[1].url).toContain('cursor=C2');
  });

  it('aggregateRuns returns grouped counts', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { groups: [{ key: 'PASS', count: 4 }, { key: 'FAIL', count: 1 }], truncated: false, totalGroups: 2 } },
    ]);
    const c = client(fetch);
    const res = await c.testing.aggregateRuns({ groupBy: 'outcome' });
    expect(res.totalGroups).toBe(2);
    expect(res.groups?.[0]).toEqual({ key: 'PASS', count: 4 });
    expect(calls[0].url).toContain('/testing/runs/aggregate');
    expect(calls[0].url).toContain('groupBy=outcome');
  });

  it('getMissionTestRun returns the mission-strict shape', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'mtr_1', workspaceId: 'w', status: 'completed', outcome: 'PASS', verdict: 'pass', startedAt: '' } },
    ]);
    const c = client(fetch);
    const run = await c.testing.getMissionTestRun('mtr_1');
    expect(run.verdict).toBe('pass');
    expect(calls[0].url).toContain('/testing/mission-test-runs/mtr_1');
  });

  it('waitForRun returns on terminal', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'run_1', jobId: 'job_1', status: 'running' } },
      { body: { id: 'run_1', jobId: 'job_1', status: 'completed' } },
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
        body: { id: 'run_1', jobId: 'job_1', status: 'running' },
      }))
    );
    const c = client(fetch);
    await expect(
      c.testing.runs.waitForRun('run_1', { timeout: 30, pollInterval: 10 })
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });
});

describe('TestingResource.listVoices', () => {
  it('GETs /testing/voices and returns voices with the default', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          // Shape and values transcribed from the OpenAPI `Voice` examples.
          voices: [
            {
              voiceId: 'Telnyx.Ultra.c8f7835e-28a3-4f0c-80d7-c1302ac62aae',
              name: 'Alistair',
              language: 'en-GB',
              accent: 'British',
              gender: 'male',
              provider: 'telnyx',
              label: 'Warm British male narrator.',
              isDefault: true,
            },
          ],
          defaultVoiceId: 'Telnyx.Ultra.c8f7835e-28a3-4f0c-80d7-c1302ac62aae',
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.testing.listVoices();
    expect(calls[0].url).toContain('/testing/voices');
    expect(calls[0].init.method).toBe('GET');
    expect(r.voices).toHaveLength(1);
    expect(r.voices[0].voiceId).toBe('Telnyx.Ultra.c8f7835e-28a3-4f0c-80d7-c1302ac62aae');
    expect(r.voices[0].name).toBe('Alistair');
    expect(r.voices[0].accent).toBe('British');
    expect(r.defaultVoiceId).toBe('Telnyx.Ultra.c8f7835e-28a3-4f0c-80d7-c1302ac62aae');
  });
});
