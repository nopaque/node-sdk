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

  it('create sends the full config surface for a non-dtmf job', async () => {
    // vertical is required by the API whenever mappingMode !== 'dtmf'; before
    // these fields existed on MappingJobConfig, audio modes were uncreatable.
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'map_2', name: 'Audio', phoneNumber: '+441', status: 'idle' } },
    ]);
    const c = client(fetch);
    await c.mapping.create({
      name: 'Audio',
      phoneNumber: '+441',
      config: {
        mappingMode: 'full-audio',
        vertical: 'Healthcare',
        probeMode: true,
        maxDepth: 4,
        maxCalls: 25,
        maxDurationMinutes: 20,
        maxConcurrency: 2,
        retryConfig: { enabled: true, maxRetries: 3 },
        repeatConfig: { behavior: 'explore_n', maxExplorations: 2 },
        enrichmentConfig: { enabled: true, types: ['quality_scoring'] },
      },
    });
    expect(JSON.parse(calls[0].init.body as string).config).toEqual({
      mappingMode: 'full-audio',
      vertical: 'Healthcare',
      probeMode: true,
      maxDepth: 4,
      maxCalls: 25,
      maxDurationMinutes: 20,
      maxConcurrency: 2,
      retryConfig: { enabled: true, maxRetries: 3 },
      repeatConfig: { behavior: 'explore_n', maxExplorations: 2 },
      enrichmentConfig: { enabled: true, types: ['quality_scoring'] },
    });
  });

  it('create forwards tags', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'map_1', name: 'Main', status: 'idle', tags: ['compliance-eu'] } },
    ]);
    const c = client(fetch);
    const job = await c.mapping.create({
      name: 'Main',
      phoneNumber: '+441',
      tags: ['compliance-eu'],
    });
    expect(job.tags).toEqual(['compliance-eu']);
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      name: 'Main',
      phoneNumber: '+441',
      tags: ['compliance-eu'],
    });
  });

  it('update forwards tags', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'map_1', name: 'x', status: 'idle', tags: ['eu'] } },
    ]);
    const c = client(fetch);
    await c.mapping.update('map_1', { tags: ['eu'] });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ tags: ['eu'] });
  });

  it('list sends filter params and reads slim items + nextCursor', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          items: [
            { id: 'map_1', name: 'A', status: 'completed', runNumber: 3, tags: ['eu'] },
          ],
          nextCursor: 'CURSOR2',
        },
      },
      { body: { items: [{ id: 'map_2', name: 'B', status: 'running' }], nextCursor: null } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const j of c.mapping.list({ status: 'completed', tag: 'eu' })) out.push(j);
    expect(out.map((j) => j.id)).toEqual(['map_1', 'map_2']);
    expect(out[0].runNumber).toBe(3);
    expect(calls[0].url).toContain('status=completed');
    expect(calls[0].url).toContain('tag=eu');
    // second page follows nextCursor via the cursor query param
    expect(calls[1].url).toContain('cursor=CURSOR2');
  });

  it('listPage returns nextToken from nextCursor', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { items: [{ id: 'map_1', name: 'A', status: 'idle' }], nextCursor: 'NEXT' } },
    ]);
    const c = client(fetch);
    const page = await c.mapping.listPage({ name: 'A' });
    expect(page.items[0].id).toBe('map_1');
    expect(page.nextToken).toBe('NEXT');
  });

  it('get returns a job with currentRun + runNumber', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          id: 'map_1',
          name: 'x',
          status: 'running',
          runNumber: 2,
          currentRun: { id: 'run_2', status: 'running', runNumber: 2 },
        },
      },
    ]);
    const c = client(fetch);
    const job = await c.mapping.get('map_1');
    expect(job.status).toBe('running');
    expect(job.runNumber).toBe(2);
    expect(job.currentRun?.id).toBe('run_2');
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

  it('probe POSTs to /runs/{runId}/probe and returns the queue summary', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { message: 'Queued 3 security probe steps', probeCount: 3 } },
    ]);
    const c = client(fetch);
    const result = await c.mapping.probe('map_1', 'run_1');
    expect(result.probeCount).toBe(3);
    expect(calls[0].url).toContain('/mapping/map_1/runs/run_1/probe');
    expect(calls[0].init.method).toBe('POST');
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

  it('tree returns enrichment fields', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          jobId: 'map_1',
          runId: 'r1',
          runNumber: 1,
          status: 'completed',
          tree: {
            stepId: 's1',
            depth: 0,
            path: [],
            status: 'completed',
            isTerminal: false,
            children: [],
            stepType: 'voice',
            voicePrompt: 'Welcome',
            probeCategory: 'injection',
            inputRequired: { type: 'pin', description: 'Enter PIN' },
          },
        },
      },
    ]);
    const c = client(fetch);
    const tree = await c.mapping.tree('map_1');
    expect(tree.runNumber).toBe(1);
    expect(tree.tree?.stepType).toBe('voice');
    expect(tree.tree?.inputRequired?.type).toBe('pin');
  });

  it('tree handles the empty-state envelope (tree: null)', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          jobId: 'map_1',
          status: 'idle',
          tree: null,
          reason: 'no_runs',
          message: 'This job has not been started yet.',
        },
      },
    ]);
    const c = client(fetch);
    const tree = await c.mapping.tree('map_1');
    expect(tree.tree).toBeNull();
    expect(tree.reason).toBe('no_runs');
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
