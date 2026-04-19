import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { NotFoundError } from '../../src/errors.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('SchedulerResource', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          id: 'sched_1',
          name: 'Daily',
          configId: 'c',
          cronExpression: '0 9 * * *',
          status: 'active',
        },
      },
    ]);
    const c = client(fetch);
    const s = await c.scheduler.create({
      name: 'Daily',
      configId: 'c',
      cronExpression: '0 9 * * *',
    });
    expect(s.id).toBe('sched_1');
    expect(calls[0].url).toContain('/schedules');
  });

  it('list paginates', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          schedules: [{ id: 'sched_1', name: 'A', configId: 'c', cronExpression: '* * * * *', status: 'active' }],
          count: 1,
        },
      },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const s of c.scheduler.list()) out.push(s);
    expect(out).toHaveLength(1);
  });

  it('get', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'sched_1', name: 'A', configId: 'c', cronExpression: '* * * * *', status: 'active' } },
    ]);
    const c = client(fetch);
    const s = await c.scheduler.get('sched_1');
    expect(s.id).toBe('sched_1');
  });

  it('get 404', async () => {
    const { fetch } = makeQueuedFetch([{ status: 404, body: { error: 'nf' } }]);
    const c = client(fetch);
    await expect(c.scheduler.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update uses PUT', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'sched_1', name: 'B', configId: 'c', cronExpression: '* * * * *', status: 'active' } },
    ]);
    const c = client(fetch);
    await c.scheduler.update('sched_1', { name: 'B' });
    expect(calls[0].init.method).toBe('PUT');
  });

  it('delete', async () => {
    const { fetch } = makeQueuedFetch([{ body: { message: 'ok' } }]);
    const c = client(fetch);
    await expect(c.scheduler.delete('sched_1')).resolves.toBeUndefined();
  });

  it('pause and resume', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'sched_1', name: 'A', configId: 'c', cronExpression: '* * * * *', status: 'paused' } },
      { body: { id: 'sched_1', name: 'A', configId: 'c', cronExpression: '* * * * *', status: 'active' } },
    ]);
    const c = client(fetch);
    const p = await c.scheduler.pause('sched_1');
    expect(p.status).toBe('paused');
    const r = await c.scheduler.resume('sched_1');
    expect(r.status).toBe('active');
    expect(calls[0].url).toContain('/schedules/sched_1/pause');
    expect(calls[1].url).toContain('/schedules/sched_1/resume');
    expect(calls[0].init.method).toBe('POST');
  });
});
