import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('LoadTestingResource', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { config: { id: 'lt_1', name: 'P', configId: 'c', concurrency: 10, totalCalls: 100, status: 'created' } } },
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
      { body: { configs: [{ id: 'lt_1', name: 'A', configId: 'c', concurrency: 1, totalCalls: 10, status: 'created' }] } },
      { body: { id: 'lt_1', name: 'A', configId: 'c', concurrency: 1, totalCalls: 10, status: 'created', testConfig: { id: 'c' } } },
      { body: { config: { id: 'lt_1', name: 'A', configId: 'c', concurrency: 2, totalCalls: 10, status: 'created' } } },
      { body: { message: 'ok' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const x of c.loadTesting.list()) out.push(x);
    expect(out).toHaveLength(1);
    await c.loadTesting.get('lt_1');
    const updated = await c.loadTesting.update('lt_1', { concurrency: 2 });
    expect(updated.concurrency).toBe(2);
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
      { body: { runs: [{ id: 'ltrun_1', loadTestId: 'lt_1', status: 'completed' }] } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.loadTesting.listRuns()) out.push(r);
    expect(out[0].id).toBe('ltrun_1');
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

const REPORT = {
  reportId: 'r_1',
  name: 'Peak',
  kind: 'load-test-runs',
  loadTestRunIds: ['run_1'],
  packs: ['data', 'excel', 'pdf'],
  includeAudio: true,
  status: 'pending',
  createdAt: '2026-11-12T00:00:00Z',
  files: [],
};

describe('LoadTestingResource reports', () => {
  it('createReport posts the body and unwraps `report`', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 202, body: { report: REPORT } }]);
    const r = await client(fetch).loadTesting.createReport({
      loadTestRunIds: ['run_1'],
      packs: ['pdf'],
      includeAudio: false,
    });
    expect(r.reportId).toBe('r_1');
    expect(calls[0].init.method).toBe('POST');
    expect(new URL(calls[0].url).pathname).toBe('/testing/reports');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      loadTestRunIds: ['run_1'],
      packs: ['pdf'],
      includeAudio: false,
    });
  });

  it('listReports pages on cursor / nextCursor', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { reports: [REPORT], nextCursor: 'c2' } },
      { body: { reports: [{ ...REPORT, reportId: 'r_2' }] } },
    ]);
    const out = [];
    for await (const r of client(fetch).loadTesting.listReports({ limit: 5 })) out.push(r.reportId);
    expect(out).toEqual(['r_1', 'r_2']);
    expect(new URL(calls[0].url).searchParams.get('cursor')).toBeNull();
    expect(new URL(calls[1].url).searchParams.get('cursor')).toBe('c2');
    expect(new URL(calls[1].url).searchParams.get('nextToken')).toBeNull();
  });

  it('listReportsPage returns one page', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { reports: [REPORT], nextCursor: 'c2' } }]);
    const page = await client(fetch).loadTesting.listReportsPage({ cursor: 'c1' });
    expect(page.items).toHaveLength(1);
    expect(page.nextToken).toBe('c2');
    expect(new URL(calls[0].url).searchParams.get('cursor')).toBe('c1');
  });

  it('getReport / deleteReport / getReportFileUrl', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { report: { ...REPORT, status: 'ready' } } },
      { status: 204 },
      { body: { url: 'https://s3/x', fileName: 'r.pdf', sizeBytes: 10, expiresAt: '2026-11-12T01:00:00Z' } },
    ]);
    const c = client(fetch);
    expect((await c.loadTesting.getReport('r_1')).status).toBe('ready');
    await c.loadTesting.deleteReport('r_1');
    const file = await c.loadTesting.getReportFileUrl('r_1', 'pdf');
    expect(file.url).toBe('https://s3/x');
    expect(new URL(calls[0].url).pathname).toBe('/testing/reports/r_1');
    expect(calls[1].init.method).toBe('DELETE');
    expect(new URL(calls[2].url).pathname).toBe('/testing/reports/r_1/files/pdf');
  });
});

describe('LoadTestingResource exports', () => {
  const EXPORT = {
    exportId: 'e_1',
    runId: 'run_1',
    status: 'pending',
    createdAt: '2026-11-12T00:00:00Z',
    expiresAt: '2026-12-12T00:00:00Z',
  };

  it('createExport / listExports / getExport', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { status: 202, body: { export: EXPORT } },
      { body: { exports: [EXPORT] } },
      { body: { export: { ...EXPORT, status: 'ready', downloadUrl: 'https://s3/z' } } },
    ]);
    const c = client(fetch);
    expect((await c.loadTesting.createExport('run_1')).exportId).toBe('e_1');
    expect(await c.loadTesting.listExports('run_1')).toHaveLength(1);
    expect((await c.loadTesting.getExport('run_1', 'e_1')).downloadUrl).toBe('https://s3/z');
    expect(calls[0].init.method).toBe('POST');
    expect(new URL(calls[0].url).pathname).toBe('/testing/load-tests/run_1/exports');
    expect(new URL(calls[2].url).pathname).toBe('/testing/load-tests/run_1/exports/e_1');
  });
});

describe('LoadTestingResource failure patterns', () => {
  it('getFailurePatterns passes scope', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          runId: 'run_1', groupId: null, scope: 'lane', rulesVersion: 3, totalCalls: 10,
          failedCalls: 2, unclassified: 0, lateStarts: 1, lateStartsPassed: 1,
          patterns: [], timeline: { bucketSecs: 15, buckets: [] }, lanes: [],
        },
      },
    ]);
    const fp = await client(fetch).loadTesting.getFailurePatterns('run_1', { scope: 'lane' });
    expect(fp.failedCalls).toBe(2);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe('/testing/load-tests/run_1/failure-patterns');
    expect(url.searchParams.get('scope')).toBe('lane');
  });

  it('reclassifyFailurePatterns POSTs with scope as a query param', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 202, body: { jobId: 'j_1' } }]);
    const out = await client(fetch).loadTesting.reclassifyFailurePatterns('run_1');
    expect(out.jobId).toBe('j_1');
    expect(calls[0].init.method).toBe('POST');
    expect(new URL(calls[0].url).pathname).toBe(
      '/testing/load-tests/run_1/failure-patterns/reclassify',
    );
  });

  it('listFailurePatternCalls pages on the returned `cursor`', async () => {
    const call = {
      callId: 'c1', runId: 'run_1', laneName: 'A', startedAt: null, failedStepIndex: null,
      failedStepName: null, evidence: {}, recordingAvailable: false,
    };
    const { fetch, calls } = makeQueuedFetch([
      { body: { items: [call], cursor: 'k2' } },
      { body: { items: [{ ...call, callId: 'c2' }] } },
    ]);
    const out = [];
    for await (const x of client(fetch).loadTesting.listFailurePatternCalls('run_1', 'LATE_START', { scope: 'group' })) {
      out.push(x.callId);
    }
    expect(out).toEqual(['c1', 'c2']);
    expect(new URL(calls[0].url).pathname).toBe(
      '/testing/load-tests/run_1/failure-patterns/LATE_START/calls',
    );
    expect(new URL(calls[1].url).searchParams.get('cursor')).toBe('k2');
    expect(new URL(calls[1].url).searchParams.get('scope')).toBe('group');
  });

  it('listFailurePatternCallsPage', async () => {
    const { fetch } = makeQueuedFetch([{ body: { items: [], cursor: 'k2' } }]);
    const page = await client(fetch).loadTesting.listFailurePatternCallsPage('run_1', 'P');
    expect(page.nextToken).toBe('k2');
  });
});
