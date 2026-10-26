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

  // Customer report: "we cannot select a language over the API". `language`
  // was absent from the SDK surface, so a caller was locked to English.
  it('create sends the call language when passed and round-trips it', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          id: 'mt_2',
          workspaceId: 'w',
          kind: 'freeform',
          sector: 'insurance',
          mission: 'Comprar una poliza',
          acceptance: 'Bot offers a quote',
          profile: { phoneNumber: '+341234' },
          status: 'queued',
          language: 'es',
          createdAt: '',
          updatedAt: '',
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.missionTests.create({
      sector: 'insurance',
      mission: 'Comprar una poliza',
      acceptance: 'Bot offers a quote',
      profile: { phoneNumber: '+341234' },
      language: 'es',
    });
    expect(run.language).toBe('es');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      sector: 'insurance',
      mission: 'Comprar una poliza',
      acceptance: 'Bot offers a quote',
      profile: { phoneNumber: '+341234' },
      language: 'es',
    });
  });

  // `multi` is the Flux-multi code-switching option, not an ISO code.
  it('create accepts multi as a call language', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'mt_3', workspaceId: 'w', status: 'queued', language: 'multi' } },
    ]);
    const c = client(fetch);
    const run = await c.missionTests.create({
      sector: 'insurance',
      mission: 'm',
      acceptance: 'a',
      profile: { phoneNumber: '+441234' },
      language: 'multi',
    });
    expect(run.language).toBe('multi');
    expect(JSON.parse(calls[0].init.body as string).language).toBe('multi');
  });

  // "Only what you pass is sent": no language key at all when the caller omits
  // it, so the api applies its own default (English) rather than the SDK's.
  it('create omits language entirely when the caller does not pass one', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'mt_4', workspaceId: 'w', status: 'queued' } },
    ]);
    const c = client(fetch);
    const run = await c.missionTests.create({
      sector: 'insurance',
      mission: 'm',
      acceptance: 'a',
      profile: { phoneNumber: '+441234' },
    });
    expect(run.language).toBeUndefined();
    const sent = JSON.parse(calls[0].init.body as string) as Record<string, unknown>;
    expect('language' in sent).toBe(false);
  });

  // A run dispatched before the field existed carries no language; absent
  // means English, and must not be coerced into a value.
  it('list returns a run with no language as undefined', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { runs: [{ id: 'mt_5', workspaceId: 'w', status: 'completed' }] } },
    ]);
    const c = client(fetch);
    const runs = [];
    for await (const r of c.missionTests.list()) runs.push(r);
    expect(runs[0].language).toBeUndefined();
  });

  it('list returns a paginator', async () => {
    // The api's real envelope is `{runs, nextCursor}`, and it pages on `cursor`.
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          runs: [
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
          nextCursor: 'C2',
        },
      },
      {
        body: {
          runs: [{ id: 'mt_2', workspaceId: 'w', testType: 'mission', status: 'pending', startedAt: '' }],
        },
      },
    ]);
    const c = client(fetch);
    const ids: string[] = [];
    for await (const item of c.missionTests.list({ limit: 10 })) ids.push(item.id);
    expect(ids).toEqual(['mt_1', 'mt_2']);
    expect(calls[1].url).toContain('cursor=C2');
    expect(calls[1].url).not.toContain('nextToken');
  });

  it('list returns a run launched from a saved config as the api sends it', async () => {
    // Shape of prod run 2bd58510: no kind/createdAt/updatedAt, `profile` is the
    // profile ID string, status "cancelled".
    const { fetch } = makeQueuedFetch([
      {
        body: {
          runs: [
            {
              id: '2bd58510',
              workspaceId: 'w',
              testType: 'mission',
              status: 'cancelled',
              startedAt: '2026-10-15T16:41:15.941Z',
              completedAt: '2026-10-15T16:42:55.605Z',
              configId: 'cfg_1',
              profile: 'profile_abc',
            },
          ],
        },
      },
    ]);
    const c = client(fetch);
    const runs = [];
    for await (const r of c.missionTests.list()) runs.push(r);
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe('cancelled');
    expect(runs[0].profile).toBe('profile_abc');
    expect(runs[0].configId).toBe('cfg_1');
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

  // 2026-10-15 Walgreens: "can you use the filtering with listing runs?"
  it('list sends every filter server-side and keeps them on later pages', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runs: [{ id: 'mt_1', workspaceId: 'w', status: 'completed' }], nextCursor: 'C2' } },
      { body: { runs: [{ id: 'mt_2', workspaceId: 'w', status: 'completed' }] } },
    ]);
    const c = client(fetch);
    const ids: string[] = [];
    for await (const r of c.missionTests.list({
      kind: 'freeform',
      configId: 'cfg_1',
      q: 'covid',
      phoneNumber: '3301900',
      tags: ['vax', 'regression'],
    })) ids.push(r.id);

    expect(ids).toEqual(['mt_1', 'mt_2']);
    for (const call of calls) {
      const u = new URL(call.url);
      expect(u.searchParams.get('kind')).toBe('freeform');
      expect(u.searchParams.get('configId')).toBe('cfg_1');
      expect(u.searchParams.get('q')).toBe('covid');
      expect(u.searchParams.get('phoneNumber')).toBe('3301900');
      expect(u.searchParams.get('tags')).toBe('vax,regression');
    }
    expect(new URL(calls[1].url).searchParams.get('cursor')).toBe('C2');
  });

  it('listPage accepts tags as a string and omits unset filters', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { runs: [] } }]);
    const c = client(fetch);
    const page = await c.missionTests.listPage({ tags: 'vax', limit: 5 });
    expect(page.items).toEqual([]);
    const u = new URL(calls[0].url);
    expect(u.searchParams.get('tags')).toBe('vax');
    expect(u.searchParams.has('configId')).toBe(false);
    expect(u.searchParams.has('cursor')).toBe(false);
  });
});
