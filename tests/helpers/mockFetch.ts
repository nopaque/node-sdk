import { vi, type Mock } from 'vitest';

export interface MockResponseSpec {
  status?: number;
  body?: unknown;          // serialized as JSON; null for no body
  text?: string;           // serialized as-is, takes precedence over body
  headers?: Record<string, string>;
}

export function makeResponse(spec: MockResponseSpec): Response {
  const status = spec.status ?? 200;
  const headers = new Headers(spec.headers ?? {});
  if (spec.text !== undefined) {
    return new Response(spec.text, { status, headers });
  }
  if (spec.body === undefined) {
    return new Response(null, { status: status === 200 ? 204 : status, headers });
  }
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(spec.body), { status, headers });
}

export interface QueuedCall {
  url: string;
  init: RequestInit;
}

export function makeQueuedFetch(
  responses: MockResponseSpec[]
): { fetch: Mock; calls: QueuedCall[] } {
  const calls: QueuedCall[] = [];
  let i = 0;
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const spec = responses[i++];
    if (!spec) throw new Error(`No queued response for call #${i}`);
    return makeResponse(spec);
  });
  return { fetch, calls };
}
