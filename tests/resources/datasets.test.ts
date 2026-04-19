import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { NotFoundError } from '../../src/errors.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('DatasetsResource', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'ds_1', name: 'D' } }]);
    const c = client(fetch);
    const ds = await c.datasets.create({ name: 'D' });
    expect(ds.id).toBe('ds_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'D' });
  });

  it('list paginates', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { items: [{ id: 'ds_1', name: 'A' }], nextToken: null } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const d of c.datasets.list()) out.push(d);
    expect(out).toHaveLength(1);
  });

  it('get', async () => {
    const { fetch } = makeQueuedFetch([{ body: { id: 'ds_1', name: 'A', itemCount: 5 } }]);
    const c = client(fetch);
    const d = await c.datasets.get('ds_1');
    expect(d.itemCount).toBe(5);
  });

  it('get 404', async () => {
    const { fetch } = makeQueuedFetch([{ status: 404, body: { error: 'nf' } }]);
    const c = client(fetch);
    await expect(c.datasets.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update uses PUT', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'ds_1', name: 'B' } }]);
    const c = client(fetch);
    await c.datasets.update('ds_1', { name: 'B' });
    expect(calls[0].init.method).toBe('PUT');
  });

  it('delete', async () => {
    const { fetch } = makeQueuedFetch([{ body: { message: 'ok' } }]);
    const c = client(fetch);
    await expect(c.datasets.delete('ds_1')).resolves.toBeUndefined();
  });

  it('resolve', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          datasetId: 'ds_1',
          resolvedEntries: [{ phoneNumber: '+441', name: 'Acme' }],
        },
      },
    ]);
    const c = client(fetch);
    const res = await c.datasets.resolve('ds_1');
    expect(res.resolvedEntries[0].phoneNumber).toBe('+441');
    expect(calls[0].url).toContain('/datasets/ds_1/resolve');
  });
});
