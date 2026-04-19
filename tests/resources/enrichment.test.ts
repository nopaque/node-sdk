import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { NotFoundError } from '../../src/errors.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('EnrichmentResource', () => {
  it('get fetches enrichment by type', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          jobId: 'map_1',
          runId: 'run_1',
          type: 'quality_scoring',
          status: 'completed',
          results: { overallScore: 78, sentiment: 'Good' },
        },
      },
    ]);
    const c = client(fetch);
    const res = await c.enrichment.get('map_1', 'run_1', 'quality_scoring');
    expect(res.status).toBe('completed');
    expect(calls[0].url).toContain('/mapping/map_1/runs/run_1/enrichments/quality_scoring');
  });

  it('get 404', async () => {
    const { fetch } = makeQueuedFetch([{ status: 404, body: { error: 'nf' } }]);
    const c = client(fetch);
    await expect(
      c.enrichment.get('map_1', 'run_1', 'quality_scoring')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tokenUsage', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          jobId: 'map_1',
          runId: 'run_1',
          usage: { ivrAnalysisTokens: 1, qualityScoringTokens: 2, totalTokens: 3 },
        },
      },
    ]);
    const c = client(fetch);
    const u = await c.enrichment.tokenUsage('map_1', 'run_1');
    expect(u.usage.totalTokens).toBe(3);
    expect(calls[0].url).toContain('/mapping/map_1/runs/run_1/token-usage');
  });

  it('enrich queues enrichment', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          jobId: 'map_1',
          runId: 'run_1',
          status: 'queued',
          enrichmentTypes: ['quality_scoring'],
        },
      },
    ]);
    const c = client(fetch);
    const res = await c.enrichment.enrich('map_1', 'run_1');
    expect(res.status).toBe('queued');
    expect(calls[0].url).toContain('/mapping/map_1/runs/run_1/enrich');
    expect(calls[0].init.method).toBe('POST');
  });

  it('enrich forwards body when provided', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          jobId: 'map_1',
          runId: 'run_1',
          status: 'queued',
          enrichmentTypes: ['quality_scoring', 'sentiment'],
        },
      },
    ]);
    const c = client(fetch);
    await c.enrichment.enrich('map_1', 'run_1', {
      enrichmentTypes: ['quality_scoring', 'sentiment'],
    });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      enrichmentTypes: ['quality_scoring', 'sentiment'],
    });
  });
});
