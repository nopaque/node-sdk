import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('MappingResource', () => {
  it('create sends expected body', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'map_1', name: 'Main', phoneNumber: '+441', status: 'idle' } },
    ]);
    const c = client(fetch);
    const job = await c.mapping.create({
      name: 'Main',
      phoneNumber: '+441',
      config: { mappingMode: 'dtmf' },
    });
    expect(job.id).toBe('map_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      name: 'Main',
      phoneNumber: '+441',
      config: { mappingMode: 'dtmf' },
    });
  });

  it('get returns a job', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'map_1', name: 'x', status: 'running' } },
    ]);
    const c = client(fetch);
    const job = await c.mapping.get('map_1');
    expect(job.status).toBe('running');
  });

  it('update sends only provided fields', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'map_1', name: 'newer', status: 'idle' } },
    ]);
    const c = client(fetch);
    await c.mapping.update('map_1', { name: 'newer' });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'newer' });
  });

  it('delete', async () => {
    const { fetch } = makeQueuedFetch([{ body: { message: 'ok' } }]);
    const c = client(fetch);
    await expect(c.mapping.delete('map_1')).resolves.toBeUndefined();
  });

  it('start + cancel', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'map_1', name: 'x', runId: 'run_1', status: 'running' } },
      { body: { id: 'map_1', name: 'x', status: 'limited' } },
    ]);
    const c = client(fetch);
    const started = await c.mapping.start('map_1');
    expect(started.status).toBe('running');
    const cancelled = await c.mapping.cancel('map_1');
    expect(cancelled.status).toBe('limited');
  });

  it('attest', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { attested: true } }]);
    const c = client(fetch);
    const res = await c.mapping.attest('map_1');
    expect(res).toEqual({ attested: true });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ jobId: 'map_1' });
  });

  it('steps paginates', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          items: [
            { id: 's1', jobId: 'map_1', runId: 'r1', depth: 0, path: [], pathString: '', status: 'completed', retryCount: 0 },
          ],
          nextToken: null,
        },
      },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const s of c.mapping.steps('map_1')) out.push(s);
    expect(out[0].id).toBe('s1');
  });

  it('tree sends format query', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          jobId: 'map_1',
          runId: 'r1',
          status: 'completed',
          tree: { stepId: 's1', depth: 0, path: [], status: 'completed', isTerminal: false, children: [] },
        },
      },
    ]);
    const c = client(fetch);
    const tree = await c.mapping.tree('map_1');
    expect(tree.tree?.stepId).toBe('s1');
    expect(calls[0].url).toContain('format=tree');
  });

  it('runs paginates', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { jobId: 'map_1', runs: [{ id: 'r1', jobId: 'map_1', status: 'completed' }], totalRuns: 1 } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.mapping.runs('map_1')) out.push(r);
    expect(out[0].id).toBe('r1');
  });

  it('paths / updatePath / deletePath / remap', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { jobId: 'map_1', rules: [{ jobId: 'map_1', path: '1>2', status: 'completed' }], totalRules: 1 } },
      { body: { jobId: 'map_1', path: '1>2', status: 'completed' } },
      { body: { message: 'ok' } },
      { body: { id: 'map_1', name: 'x', status: 'running' } },
    ]);
    const c = client(fetch);
    const paths = [];
    for await (const p of c.mapping.paths('map_1')) paths.push(p);
    expect(paths[0].path).toBe('1>2');
    await c.mapping.updatePath('map_1', '1>2', { label: 'First' });
    await c.mapping.deletePath('map_1', '1>2');
    await c.mapping.remap('map_1', '1>2');
  });

  it('probe', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { probed: true } }]);
    const c = client(fetch);
    await c.mapping.probe('map_1', 'r_1', { payload: { foo: 'bar' } });
    expect(calls[0].url).toContain('/mapping/map_1/runs/r_1/probe');
  });

  it('waitForComplete returns once terminal', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'map_1', name: 'x', status: 'running' } },
      { body: { id: 'map_1', name: 'x', status: 'running' } },
      { body: { id: 'map_1', name: 'x', status: 'completed' } },
    ]);
    const c = client(fetch);
    const job = await c.mapping.waitForComplete('map_1', { timeout: 5000, pollInterval: 1 });
    expect(job.status).toBe('completed');
  });

  it('waitForComplete times out', async () => {
    const { fetch } = makeQueuedFetch(
      Array.from({ length: 50 }, () => ({
        body: { id: 'map_1', name: 'x', status: 'running' },
      }))
    );
    const c = client(fetch);
    await expect(
      c.mapping.waitForComplete('map_1', { timeout: 30, pollInterval: 10 })
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });
});
