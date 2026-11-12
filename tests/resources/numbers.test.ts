import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

const NUMBER = {
  numberId: 'n_1', e164: '+447700900000', countryIso2: 'GB', phoneNumberType: 'mobile',
  capabilities: ['voice', 'sms'], type: 'survey', uses: ['survey'], state: 'live',
  createdAt: '2026-11-12T00:00:00Z',
};

describe('NumbersResource', () => {
  it('list returns numbers and allowance', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { numbers: [NUMBER], allowance: { used: 1, max: 3, remaining: 2, unlimited: false, source: 'tier', tier: 'pro' } } },
    ]);
    const out = await client(fetch).numbers.list();
    expect(out.numbers[0].numberId).toBe('n_1');
    expect(out.allowance?.remaining).toBe(2);
    expect(new URL(calls[0].url).pathname).toBe('/numbers');
  });

  it('listAvailable and getRequirements send query params', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { country: 'GB', phoneNumberType: 'mobile', numberType: 'survey', numbers: [] } },
      { body: { country: 'GB', phoneNumberType: 'mobile', requirements: [] } },
    ]);
    const c = client(fetch);
    await c.numbers.listAvailable({ country: 'GB', numberType: 'outbound', limit: 5 });
    await c.numbers.getRequirements({ country: 'gb' });
    const a = new URL(calls[0].url);
    expect(a.pathname).toBe('/numbers/available');
    expect(a.searchParams.get('country')).toBe('GB');
    expect(a.searchParams.get('numberType')).toBe('outbound');
    expect(a.searchParams.get('limit')).toBe('5');
    expect(a.searchParams.has('phoneNumberType')).toBe(false);
    expect(new URL(calls[1].url).pathname).toBe('/numbers/requirements');
  });

  it('order posts the body and returns the order', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { status: 202, body: { number: { ...NUMBER, state: 'ordering' }, orderId: 'o_1', activation: { immediate: false } } },
    ]);
    const out = await client(fetch).numbers.order({ e164: '+447700900000', numberType: 'survey', country: 'GB' });
    expect(out.orderId).toBe('o_1');
    expect(calls[0].init.method).toBe('POST');
    expect(new URL(calls[0].url).pathname).toBe('/numbers/orders');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      e164: '+447700900000', numberType: 'survey', country: 'GB',
    });
  });

  it('order is not retried on a 5xx', async () => {
    const { fetch } = makeQueuedFetch([{ status: 502, body: { message: 'bad gateway' } }]);
    const c = new Nopaque({ apiKey: 'k', fetch, maxRetries: 3 });
    await expect(
      c.numbers.order({ e164: '+447700900000', numberType: 'survey', country: 'GB' }),
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('getOrder / update / release', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { orderId: 'o_1', number: NUMBER, progress: { complete: false, total: 6, approved: 5, awaitingOn: 1, outstanding: [], waitingOn: 'telnyx' } } },
      { body: { number: { ...NUMBER, uses: ['outbound'], isDefault: true } } },
      { body: { released: true, message: 'Released.' } },
    ]);
    const c = client(fetch);
    expect((await c.numbers.getOrder('o_1')).progress.waitingOn).toBe('telnyx');
    const updated = await c.numbers.update('n_1', { uses: ['outbound'], isDefault: true });
    expect(updated.isDefault).toBe(true);
    expect((await c.numbers.release('n_1')).released).toBe(true);
    expect(new URL(calls[0].url).pathname).toBe('/numbers/orders/o_1');
    expect(calls[1].init.method).toBe('PATCH');
    expect(new URL(calls[1].url).pathname).toBe('/numbers/n_1');
    expect(calls[2].init.method).toBe('POST');
    expect(new URL(calls[2].url).pathname).toBe('/numbers/n_1/release');
  });
});

describe('NumbersResource path encoding', () => {
  it('keeps an id to one path segment', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { released: true } }]);
    await client(fetch).numbers.release('n_1/../n_2');
    expect(new URL(calls[0].url).pathname).toBe('/numbers/n_1%2F..%2Fn_2/release');
  });
});
