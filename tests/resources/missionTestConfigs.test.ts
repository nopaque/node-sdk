import { describe, it, expect } from 'vitest';
import { Nopaque, NotFoundError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

const cfgFixture = {
  id: 'cfg_1',
  workspaceId: 'w',
  name: 'qa',
  sector: 'insurance',
  mission: 'm',
  acceptance: 'a',
  profileId: 'p_1',
  createdAt: '',
  updatedAt: '',
};

describe('MissionTestConfigsResource', () => {
  it('create sends expected body and returns the config', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfgFixture }]);
    const c = client(fetch);
    const cfg = await c.missionTestConfigs.create({
      name: 'qa',
      sector: 'insurance',
      mission: 'm',
      acceptance: 'a',
      profileId: 'p_1',
    });
    expect(cfg.id).toBe('cfg_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      name: 'qa',
      sector: 'insurance',
      mission: 'm',
      acceptance: 'a',
      profileId: 'p_1',
    });
  });

  it('list returns a paginator', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { items: [cfgFixture], nextToken: null } },
    ]);
    const c = client(fetch);
    const ids: string[] = [];
    for await (const cfg of c.missionTestConfigs.list()) ids.push(cfg.id);
    expect(ids).toEqual(['cfg_1']);
  });

  it('get returns a config', async () => {
    const { fetch } = makeQueuedFetch([{ body: cfgFixture }]);
    const c = client(fetch);
    expect((await c.missionTestConfigs.get('cfg_1')).name).toBe('qa');
  });

  it('delete', async () => {
    const { fetch } = makeQueuedFetch([{ body: { message: 'ok' } }]);
    const c = client(fetch);
    await expect(c.missionTestConfigs.delete('cfg_1')).resolves.toBeUndefined();
  });

  it('run launches a mission test from a config', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          id: 'mt_2',
          workspaceId: 'w',
          kind: 'freeform',
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
    const run = await c.missionTestConfigs.run('cfg_1');
    expect(run.id).toBe('mt_2');
    expect(calls[0].url).toContain('/testing/mission-test-configs/cfg_1/runs');
    expect(calls[0].init.method).toBe('POST');
  });

  it('get on a cross-workspace id raises NotFoundError', async () => {
    const { fetch } = makeQueuedFetch([
      { status: 404, body: { error: 'not found' } },
    ]);
    const c = client(fetch);
    await expect(c.missionTestConfigs.get('cfg_other')).rejects.toBeInstanceOf(NotFoundError);
  });
});
