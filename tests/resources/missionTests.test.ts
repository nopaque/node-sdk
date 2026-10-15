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
});
