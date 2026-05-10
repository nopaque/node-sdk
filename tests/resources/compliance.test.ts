import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueAPIError, NotFoundError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('ComplianceResource', () => {
  it('getCatalogue returns the catalogue and limits', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          catalogue: { version: 'v1', regulations: [], tests: [] },
          pickerLimit: 50,
          s2stestSecondsAvailable: 600,
          tier: 'pro',
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.compliance.getCatalogue();
    expect(r.catalogue.version).toBe('v1');
    expect(r.pickerLimit).toBe(50);
  });

  it('run dispatches a batch and returns run ids', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runIds: ['r1', 'r2'], reportUrl: '/testing/compliance-reports/%2B441234' } },
    ]);
    const c = client(fetch);
    const r = await c.compliance.run({
      phoneNumber: '+441234',
      sector: 'insurance',
      testIds: ['M-001', 'M-002'],
    });
    expect(r.runIds).toEqual(['r1', 'r2']);
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      phoneNumber: '+441234',
      sector: 'insurance',
      testIds: ['M-001', 'M-002'],
    });
  });

  it('run surfaces BATCH_SIZE_EXCEEDS_TIER as a typed error with code', async () => {
    const { fetch } = makeQueuedFetch([
      { status: 402, body: { error: 'too many', code: 'BATCH_SIZE_EXCEEDS_TIER' } },
    ]);
    const c = client(fetch);
    const promise = c.compliance.run({
      phoneNumber: '+441234',
      sector: 'insurance',
      testIds: new Array(100).fill('M-001'),
    });
    await expect(promise).rejects.toBeInstanceOf(NopaqueAPIError);
    await expect(promise).rejects.toMatchObject({ code: 'BATCH_SIZE_EXCEEDS_TIER' });
  });

  it('listReports paginates', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          items: [
            { phoneNumber: '+441234', passed: 2, failed: 3, total: 5, lastRunAt: '' },
          ],
          nextToken: null,
        },
      },
    ]);
    const c = client(fetch);
    const out: string[] = [];
    for await (const r of c.compliance.listReports()) out.push(r.phoneNumber);
    expect(out).toEqual(['+441234']);
  });

  it('getReport URL-encodes the phone number leading +', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          summary: {
            phoneNumber: '+441234',
            catalogueVersion: 'v1',
            passed: 2,
            failed: 3,
            pending: 0,
            generatedAt: '',
          },
          sections: [],
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.compliance.getReport('+441234');
    expect(r.summary.phoneNumber).toBe('+441234');
    expect(calls[0].url).toContain('/testing/compliance-reports/%2B441234');
  });

  it('getReport on an unknown number returns NotFoundError', async () => {
    const { fetch } = makeQueuedFetch([
      { status: 404, body: { error: 'not found' } },
    ]);
    const c = client(fetch);
    await expect(c.compliance.getReport('+449999999')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('generatePdfUrl posts and returns the presigned URL', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { url: 'https://s3/...presigned' } },
    ]);
    const c = client(fetch);
    const r = await c.compliance.generatePdfUrl('+441234', { regulationKey: 'eu-ai-act' });
    expect(r.url).toContain('presigned');
    expect(calls[0].url).toContain('/testing/compliance-reports/%2B441234/pdf');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ regulationKey: 'eu-ai-act' });
  });

  it('downloadReportPdf fetches the URL and returns bytes', async () => {
    // The first response is the API call to generate the URL; the second is
    // the raw S3 download. mockFetch JSON-encodes the body, so we use `text`
    // for the second call to return raw text — arrayBuffer() then yields bytes.
    const { fetch } = makeQueuedFetch([
      { body: { url: 'https://s3/file.pdf' } },
      { text: '%PDF-1.4 fake', headers: { 'content-type': 'application/pdf' } },
    ]);
    const c = client(fetch);
    const bytes = await c.compliance.downloadReportPdf('+441234');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // First 4 bytes are the PDF magic '%PDF'.
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it('rerun POSTs to /rerun', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          id: 'mt_3',
          workspaceId: 'w',
          kind: 'compliance',
          sector: 'i',
          mission: 'm',
          acceptance: 'a',
          profile: { phoneNumber: '+44' },
          status: 'queued',
          createdAt: '',
          updatedAt: '',
        },
      },
    ]);
    const c = client(fetch);
    await c.compliance.rerun('mt_old');
    expect(calls[0].url).toContain('/testing/compliance-runs/mt_old/rerun');
    expect(calls[0].init.method).toBe('POST');
  });
});
