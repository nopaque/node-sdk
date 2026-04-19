import { describe, it, expect, vi } from 'vitest';
import { Transport } from '../src/transport.js';
import { resolveConfig } from '../src/config.js';
import {
  APIConnectionError,
  APITimeoutError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NopaqueAPIError,
} from '../src/errors.js';
import { makeQueuedFetch } from './helpers/mockFetch.js';

describe('Transport', () => {
  it('sends x-api-key and user-agent headers', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'm_1' } }]);
    const t = new Transport(resolveConfig({ apiKey: 'k_abc', fetch, maxRetries: 0 }));
    const data = await t.request('GET', '/mapping/m_1');
    expect(data).toEqual({ id: 'm_1' });
    const h = calls[0].init.headers as Headers;
    expect(h.get('x-api-key')).toBe('k_abc');
    expect(h.get('user-agent')).toMatch(/^nopaque-node\//);
  });

  it('maps 404 to NotFoundError', async () => {
    const { fetch } = makeQueuedFetch([
      { status: 404, body: { error: 'not found', code: 'missing' } },
    ]);
    const t = new Transport(resolveConfig({ apiKey: 'k', fetch, maxRetries: 0 }));
    await expect(t.request('GET', '/x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps 401 to AuthenticationError', async () => {
    const { fetch } = makeQueuedFetch([{ status: 401, body: { error: 'unauth' } }]);
    const t = new Transport(resolveConfig({ apiKey: 'k', fetch, maxRetries: 0 }));
    await expect(t.request('GET', '/x')).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('parses retry-after header on 429', async () => {
    const { fetch } = makeQueuedFetch([
      {
        status: 429,
        body: { error: 'rate' },
        headers: { 'retry-after': '7' },
      },
    ]);
    const t = new Transport(resolveConfig({ apiKey: 'k', fetch, maxRetries: 0 }));
    const err = await t.request('GET', '/x').catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(7);
  });

  it('5xx maps to ServerError', async () => {
    const { fetch } = makeQueuedFetch([{ status: 502, body: { error: 'gateway' } }]);
    const t = new Transport(resolveConfig({ apiKey: 'k', fetch, maxRetries: 0 }));
    await expect(t.request('GET', '/x')).rejects.toBeInstanceOf(ServerError);
  });

  it('unknown status maps to base NopaqueAPIError', async () => {
    const { fetch } = makeQueuedFetch([{ status: 418, body: { error: 't' } }]);
    const t = new Transport(resolveConfig({ apiKey: 'k', fetch, maxRetries: 0 }));
    await expect(t.request('GET', '/x')).rejects.toBeInstanceOf(NopaqueAPIError);
  });

  it('network failure becomes APIConnectionError', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('network');
    });
    const t = new Transport(resolveConfig({ apiKey: 'k', fetch, maxRetries: 0 }));
    await expect(t.request('GET', '/x')).rejects.toBeInstanceOf(APIConnectionError);
  });

  it('abort becomes APITimeoutError', async () => {
    const fetch = vi.fn(async () => {
      const e = new Error('aborted');
      (e as { name: string }).name = 'AbortError';
      throw e;
    });
    const t = new Transport(resolveConfig({ apiKey: 'k', fetch, maxRetries: 0, timeout: 10 }));
    await expect(t.request('GET', '/x')).rejects.toBeInstanceOf(APITimeoutError);
  });

  it('honors default headers', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: {} }]);
    const t = new Transport(
      resolveConfig({
        apiKey: 'k',
        fetch,
        maxRetries: 0,
        defaultHeaders: { 'X-Source': 'worker' },
      })
    );
    await t.request('GET', '/x');
    const h = calls[0].init.headers as Headers;
    expect(h.get('x-source')).toBe('worker');
  });

  it('per-call headers override defaults', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: {} }]);
    const t = new Transport(
      resolveConfig({
        apiKey: 'k',
        fetch,
        maxRetries: 0,
        defaultHeaders: { 'X-Source': 'default' },
      })
    );
    await t.request('GET', '/x', { requestOptions: { headers: { 'X-Source': 'override' } } });
    const h = calls[0].init.headers as Headers;
    expect(h.get('x-source')).toBe('override');
  });
});
