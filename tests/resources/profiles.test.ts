import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { NotFoundError } from '../../src/errors.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('ProfilesResource', () => {
  it('create sends body', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'prof_1', name: 'Test' } }]);
    const c = client(fetch);
    const p = await c.profiles.create({ name: 'Test', description: 'x' });
    expect(p.id).toBe('prof_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'Test', description: 'x' });
  });

  it('list paginates', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { items: [{ id: 'prof_1', name: 'A' }], nextToken: 't' } },
      { body: { items: [{ id: 'prof_2', name: 'B' }], nextToken: null } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const p of c.profiles.list()) out.push(p);
    expect(out.map((x) => x.id)).toEqual(['prof_1', 'prof_2']);
  });

  it('get', async () => {
    const { fetch } = makeQueuedFetch([{ body: { id: 'prof_1', name: 'A', items: [] } }]);
    const c = client(fetch);
    const p = await c.profiles.get('prof_1');
    expect(p.id).toBe('prof_1');
  });

  it('get 404', async () => {
    const { fetch } = makeQueuedFetch([{ status: 404, body: { error: 'nf' } }]);
    const c = client(fetch);
    await expect(c.profiles.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'prof_1', name: 'B' } }]);
    const c = client(fetch);
    await c.profiles.update('prof_1', { name: 'B' });
    expect(calls[0].init.method).toBe('PUT');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'B' });
  });

  it('delete', async () => {
    const { fetch } = makeQueuedFetch([{ body: { message: 'ok' } }]);
    const c = client(fetch);
    await expect(c.profiles.delete('prof_1')).resolves.toBeUndefined();
  });

  it('addItem', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'item_1', profileId: 'prof_1', label: 'x', value: 'y' } },
    ]);
    const c = client(fetch);
    const item = await c.profiles.addItem('prof_1', { label: 'x', value: 'y' });
    expect(item.id).toBe('item_1');
    expect(calls[0].url).toContain('/profiles/prof_1/items');
  });

  it('updateItem', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'item_1', value: 'z' } }]);
    const c = client(fetch);
    await c.profiles.updateItem('prof_1', 'item_1', { value: 'z' });
    expect(calls[0].init.method).toBe('PUT');
    expect(calls[0].url).toContain('/profiles/prof_1/items/item_1');
  });

  it('deleteItem', async () => {
    const { fetch } = makeQueuedFetch([{ body: { message: 'ok' } }]);
    const c = client(fetch);
    await expect(c.profiles.deleteItem('prof_1', 'item_1')).resolves.toBeUndefined();
  });

  it('listParameters', async () => {
    const { fetch } = makeQueuedFetch([{ body: { parameters: ['account_number', 'postcode'] } }]);
    const c = client(fetch);
    const res = await c.profiles.listParameters();
    expect(res.parameters).toContain('account_number');
  });

  it('findByParameters with array of labels', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { items: [{ id: 'prof_1', name: 'A', matchedLabels: ['account_number'] }] } },
    ]);
    const c = client(fetch);
    const res = await c.profiles.findByParameters({ labels: ['account_number', 'postcode'] });
    expect(res.items[0].id).toBe('prof_1');
    expect(calls[0].url).toContain('labels=account_number%2Cpostcode');
  });
});
