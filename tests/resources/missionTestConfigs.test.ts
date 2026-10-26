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

  it('create forwards tags', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { ...cfgFixture, tags: ['finance-uk'] } }]);
    const c = client(fetch);
    const cfg = await c.missionTestConfigs.create({
      name: 'qa',
      sector: 'insurance',
      mission: 'm',
      acceptance: 'a',
      profileId: 'p_1',
      tags: ['finance-uk'],
    });
    expect(cfg.tags).toEqual(['finance-uk']);
    expect(JSON.parse(calls[0].init.body as string).tags).toEqual(['finance-uk']);
  });

  // Gap found alongside the mission-test create path: the saved-config
  // endpoints take a call language too, and it was missing from the SDK.
  it('create sends the call language and round-trips it', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { ...cfgFixture, language: 'es' } }]);
    const c = client(fetch);
    const cfg = await c.missionTestConfigs.create({
      name: 'qa',
      sector: 'insurance',
      mission: 'm',
      acceptance: 'a',
      profileId: 'p_1',
      language: 'es',
    });
    expect(cfg.language).toBe('es');
    expect(JSON.parse(calls[0].init.body as string).language).toBe('es');
  });

  it('create omits language entirely when the caller does not pass one', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfgFixture }]);
    const c = client(fetch);
    const cfg = await c.missionTestConfigs.create({
      name: 'qa',
      sector: 'insurance',
      mission: 'm',
      acceptance: 'a',
      profileId: 'p_1',
    });
    expect(cfg.language).toBeUndefined();
    const sent = JSON.parse(calls[0].init.body as string) as Record<string, unknown>;
    expect('language' in sent).toBe(false);
  });

  // `null` is the clear sentinel (DDB REMOVE, same as description/tags) and
  // reverts the config to English; omitting the key leaves it unchanged.
  it('update clears the language with null and leaves it alone when omitted', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfgFixture }, { body: cfgFixture }]);
    const c = client(fetch);

    await c.missionTestConfigs.update('cfg_1', { language: null });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ language: null });

    await c.missionTestConfigs.update('cfg_1', { name: 'qa2' });
    const second = JSON.parse(calls[1].init.body as string) as Record<string, unknown>;
    expect('language' in second).toBe(false);
  });

  it('update sets a new language', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { ...cfgFixture, language: 'multi' } }]);
    const c = client(fetch);
    const cfg = await c.missionTestConfigs.update('cfg_1', { language: 'multi' });
    expect(cfg.language).toBe('multi');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ language: 'multi' });
  });

  it('list exposes the language on the slim item', async () => {
    const slim = {
      id: 'cfg_1', workspaceId: 'w', name: 'qa', sector: 'insurance',
      profileId: 'p_1', language: 'fr', createdAt: '', updatedAt: '',
    };
    const { fetch } = makeQueuedFetch([{ body: { configs: [slim] } }]);
    const c = client(fetch);
    const out = [];
    for await (const x of c.missionTestConfigs.list()) out.push(x);
    expect(out[0].language).toBe('fr');
  });

  it('list returns slim items, sends filters and follows nextCursor', async () => {
    const slim = { id: 'cfg_1', workspaceId: 'w', name: 'qa', sector: 'insurance', profileId: 'p_1', createdAt: '', updatedAt: '' };
    const { fetch, calls } = makeQueuedFetch([
      // The api's real envelope: `{configs, nextCursor}`. 2026-10-15 Walgreens:
      // list({ name }) returned nothing because the SDK read `items`.
      { body: { configs: [slim], nextCursor: 'C2' } },
      { body: { configs: [{ ...slim, id: 'cfg_2' }] } },
    ]);
    const c = client(fetch);
    const ids: string[] = [];
    for await (const cfg of c.missionTestConfigs.list({ sector: 'insurance', tag: 'finance-uk' })) ids.push(cfg.id);
    expect(ids).toEqual(['cfg_1', 'cfg_2']);
    expect(calls[0].url).toContain('sector=insurance');
    expect(calls[0].url).toContain('tag=finance-uk');
    expect(calls[1].url).toContain('cursor=C2');
  });

  it('update PATCHes the config', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { ...cfgFixture, name: 'renamed' } }]);
    const c = client(fetch);
    const cfg = await c.missionTestConfigs.update('cfg_1', { name: 'renamed', tags: null });
    expect(cfg.name).toBe('renamed');
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toContain('/testing/mission-test-configs/cfg_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'renamed', tags: null });
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
