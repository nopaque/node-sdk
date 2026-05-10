import { describe, it, expect } from 'vitest';
import { Nopaque, NotFoundError, ServerError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('MissionTestsResource', () => {
  it('create sends the expected body', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          id: 'mt_1',
          workspaceId: 'w',
          kind: 'freeform',
          sector: 'insurance',
          mission: 'Buy a policy',
          acceptance: 'Bot offers a quote',
          profile: { phoneNumber: '+441234' },
          status: 'queued',
          createdAt: '',
          updatedAt: '',
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.missionTests.create({
      sector: 'insurance',
      mission: 'Buy a policy',
      acceptance: 'Bot offers a quote',
      profile: { phoneNumber: '+441234' },
    });
    expect(run.id).toBe('mt_1');
    expect(run.kind).toBe('freeform');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      sector: 'insurance',
      mission: 'Buy a policy',
      acceptance: 'Bot offers a quote',
      profile: { phoneNumber: '+441234' },
    });
  });

  it('list returns a paginator', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          items: [
            {
              id: 'mt_1',
              workspaceId: 'w',
              kind: 'freeform',
              sector: 'i',
              mission: 'm',
              acceptance: 'a',
              profile: { phoneNumber: '+44' },
              status: 'completed',
              createdAt: '',
              updatedAt: '',
            },
          ],
          nextToken: null,
        },
      },
    ]);
    const c = client(fetch);
    const ids: string[] = [];
    for await (const item of c.missionTests.list({ limit: 10 })) ids.push(item.id);
    expect(ids).toEqual(['mt_1']);
  });

  it('getDefaults returns defaults', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { sector: 'insurance', mission: 'm', acceptance: 'a', catalogueVersion: 'v1' } },
    ]);
    const c = client(fetch);
    const d = await c.missionTests.getDefaults();
    expect(d.catalogueVersion).toBe('v1');
  });

  it('getDefaults surfaces CATALOG_NOT_READY as a typed ServerError with code', async () => {
    const { fetch } = makeQueuedFetch([
      { status: 503, body: { error: 'not ready', code: 'CATALOG_NOT_READY' } },
    ]);
    const c = client(fetch);
    const promise = c.missionTests.getDefaults();
    await expect(promise).rejects.toBeInstanceOf(ServerError);
    await expect(promise).rejects.toMatchObject({ code: 'CATALOG_NOT_READY' });
  });

  it('get returns a run', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          id: 'mt_1',
          workspaceId: 'w',
          kind: 'freeform',
          sector: 'i',
          mission: 'm',
          acceptance: 'a',
          profile: { phoneNumber: '+44' },
          status: 'running',
          createdAt: '',
          updatedAt: '',
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.missionTests.get('mt_1');
    expect(run.status).toBe('running');
  });

  it('get on a cross-workspace id raises NotFoundError', async () => {
    const { fetch } = makeQueuedFetch([
      { status: 404, body: { error: 'not found' } },
    ]);
    const c = client(fetch);
    await expect(c.missionTests.get('mt_other')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('cancel sends POST to /cancel', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          id: 'mt_1',
          workspaceId: 'w',
          kind: 'freeform',
          sector: 'i',
          mission: 'm',
          acceptance: 'a',
          profile: { phoneNumber: '+44' },
          status: 'cancelled',
          createdAt: '',
          updatedAt: '',
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.missionTests.cancel('mt_1');
    expect(r.status).toBe('cancelled');
    expect(calls[0].url).toContain('/testing/mission-tests/mt_1/cancel');
    expect(calls[0].init.method).toBe('POST');
  });
});
