import type { ResolvedConfig } from './config.js';
import {
  APIConnectionError,
  APITimeoutError,
  NopaqueAPIError,
  RateLimitError,
  classifyStatus,
} from './errors.js';
import { composeUserAgent } from './userAgent.js';
import { mergeOptions, type RequestOptions } from './requestOptions.js';

export interface RequestParams {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  requestOptions?: RequestOptions;
}

export class Transport {
  constructor(public readonly config: ResolvedConfig) {}

  async request<T = unknown>(
    method: string,
    path: string,
    { params, body, requestOptions }: RequestParams = {}
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const headers = this.buildHeaders(requestOptions);
    const merged = mergeOptions(undefined, requestOptions);
    const timeout = merged.timeout ?? this.config.timeout;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const combinedSignal = mergeAbortSignals([controller.signal, merged.signal]);

    let response: Response;
    try {
      response = await this.config.fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: combinedSignal,
      });
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        throw new APITimeoutError(`request timed out after ${timeout}ms`);
      }
      throw new APIConnectionError(
        `fetch failed: ${(err as Error).message ?? 'unknown'}`,
        err
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw await classifyResponse(response);
    }

    if (response.status === 204) return undefined as T;
    const ct = response.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return undefined as T;
    return (await response.json()) as T;
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | null | undefined>
  ): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.config.baseUrl}${normalized}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private buildHeaders(options: RequestOptions | undefined): Headers {
    const h = new Headers({
      'x-api-key': this.config.apiKey,
      'user-agent': composeUserAgent(),
      'accept': 'application/json',
    });
    for (const [k, v] of Object.entries(this.config.defaultHeaders)) h.set(k, v);
    if (options?.headers) {
      for (const [k, v] of Object.entries(options.headers)) h.set(k, v);
    }
    return h;
  }
}

async function classifyResponse(response: Response): Promise<NopaqueAPIError> {
  let body: unknown = null;
  try {
    body = await response.clone().json();
  } catch {
    body = null;
  }
  const bodyObj = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const message = typeof bodyObj.error === 'string' ? bodyObj.error : `HTTP ${response.status}`;
  const code = typeof bodyObj.code === 'string' ? bodyObj.code : null;
  const details = bodyObj.details ?? null;
  const requestId = response.headers.get('x-request-id');

  const Cls = classifyStatus(response.status);
  if (Cls === RateLimitError) {
    const raw = response.headers.get('retry-after');
    const retryAfter = raw !== null ? Number.parseFloat(raw) : null;
    return new RateLimitError({
      status: response.status,
      code,
      message,
      details,
      requestId,
      response,
      retryAfter: Number.isFinite(retryAfter!) ? retryAfter : null,
    });
  }
  return new Cls({
    status: response.status,
    code,
    message,
    details,
    requestId,
    response,
  });
}

function mergeAbortSignals(signals: (AbortSignal | undefined)[]): AbortSignal {
  const valid = signals.filter((s): s is AbortSignal => !!s);
  if (valid.length === 1) return valid[0];
  if (valid.length === 0) return new AbortController().signal;
  const ctrl = new AbortController();
  for (const s of valid) {
    if (s.aborted) {
      ctrl.abort(s.reason);
      return ctrl.signal;
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}
