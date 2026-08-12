import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('DigitalComplianceResource', () => {
  it('listAudits returns the audits array', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          audits: [
            {
              targetRef: 'acme/billing-bot',
              lastRunAt: '2026-08-12T00:00:00Z',
              runCount: 4,
              catalogueTestIds: ['M-001'],
            },
          ],
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.digitalCompliance.listAudits();
    expect(calls[0].url).toContain('/digital-testing/compliance-audits');
    expect(r).toHaveLength(1);
    expect(r[0].runCount).toBe(4);
  });

  it('getReport sends targetRef as a QUERY param, never a path segment', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { targetRef: 'acme/billing-bot' } }]);
    const c = client(fetch);
    await c.digitalCompliance.getReport('acme/billing-bot');
    // A targetRef contains slashes, so it cannot be a path segment.
    expect(calls[0].url).toContain('/digital-testing/compliance-audits/report');
    expect(calls[0].url).toContain('targetRef=acme%2Fbilling-bot');
    expect(calls[0].url).not.toContain('report/acme');
  });
});
