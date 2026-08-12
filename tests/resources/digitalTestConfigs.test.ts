import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';
import type { DigitalTestConfig } from '../../src/types/digitalTesting.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

// Fixtures follow the OpenAPI schemas' documented shapes and examples.
function cfg(over: Partial<DigitalTestConfig> = {}): DigitalTestConfig {
  return {
    id: 'c1',
    workspaceId: 'w1',
    name: 'Billing bot smoke',
    targetRef: 'acme/billing-bot',
    target: { transport: 'web-widget', url: 'https://example.com/support' },
    sector: 'utilities',
    mission: 'Pay my bill',
    kind: 'freeform',
    acceptance: 'The bot states the outstanding balance.',
    createdAt: '2026-08-12T00:00:00Z',
    updatedAt: '2026-08-12T00:00:00Z',
    ...over,
  };
}

describe('DigitalTestConfigsResource', () => {
  it('create POSTs the config', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfg() }]);
    const c = client(fetch);
    const r = await c.digitalTestConfigs.create({
      name: 'Billing bot smoke',
      targetRef: 'acme/billing-bot',
      target: { transport: 'web-widget', url: 'https://example.com/support' },
      sector: 'utilities',
      mission: 'Pay my bill',
    });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/digital-testing/configs');
    expect(r.id).toBe('c1');
  });

  it('get fetches one config', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfg() }]);
    const c = client(fetch);
    await c.digitalTestConfigs.get('c1');
    expect(calls[0].url).toContain('/digital-testing/configs/c1');
  });

  it('update PATCHes, not PUTs', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfg({ name: 'Renamed' }) }]);
    const c = client(fetch);
    const r = await c.digitalTestConfigs.update('c1', { name: 'Renamed' });
    expect(calls[0].init.method).toBe('PATCH');
    expect(r.name).toBe('Renamed');
  });

  it('delete DELETEs and returns nothing', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 204 }]);
    const c = client(fetch);
    await c.digitalTestConfigs.delete('c1');
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toContain('/digital-testing/configs/c1');
  });

  it('launch POSTs to the runs subpath and unwraps the run', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          message: 'Digital test queued',
          run: {
            id: 'r9',
            workspaceId: 'w1',
            targetRef: 'acme/billing-bot',
            channel: 'chat',
            kind: 'freeform',
            status: 'pending',
            startedAt: '2026-08-12T00:00:00Z',
          },
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.digitalTestConfigs.launch('c1', { samples: 3 });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/digital-testing/configs/c1/runs');
    expect(r.id).toBe('r9');
  });

  it('list follows nextCursor using the configs key', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { configs: [cfg({ id: 'c1' })], nextCursor: 'c2' } },
      { body: { configs: [cfg({ id: 'c2' })] } },
    ]);
    const c = client(fetch);
    const seen: string[] = [];
    for await (const item of c.digitalTestConfigs.list()) seen.push(item.id);
    expect(seen).toEqual(['c1', 'c2']);
    expect(calls[1].url).toContain('cursor=c2');
  });

  it('list advances past a caller-supplied cursor rather than repeating page one', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { configs: [cfg({ id: 'c1' })], nextCursor: 'c2' } },
      { body: { configs: [cfg({ id: 'c2' })], nextCursor: 'c3' } },
      { body: { configs: [cfg({ id: 'c3' })] } },
    ]);
    const c = client(fetch);
    const seen: string[] = [];
    for await (const item of c.digitalTestConfigs.list({ cursor: 'c1' })) seen.push(item.id);
    expect(seen).toEqual(['c1', 'c2', 'c3']);
    expect(calls.map((call) => new URL(call.url).searchParams.get('cursor'))).toEqual([
      'c1',
      'c2',
      'c3',
    ]);
  });

  it('listPage maps configs and nextCursor onto the Page shape', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { configs: [cfg()], nextCursor: 'c2' } },
    ]);
    const c = client(fetch);
    const page = await c.digitalTestConfigs.listPage({ limit: 1 });
    expect(calls[0].url).toContain('/digital-testing/configs');
    expect(calls[0].url).toContain('limit=1');
    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe('c1');
    expect(page.nextToken).toBe('c2');
  });

  it('listPage reports a null nextToken on the last page, where nextCursor is OMITTED', async () => {
    const { fetch } = makeQueuedFetch([{ body: { configs: [cfg()] } }]);
    const c = client(fetch);
    const page = await c.digitalTestConfigs.listPage();
    expect(page.nextToken).toBeNull();
  });
});
