import { describe, it, expect } from 'vitest';
import { computeBackoff, shouldRetry, delayFor } from '../src/retry.js';
import {
  RateLimitError,
  ServerError,
  ConflictError,
  NotFoundError,
  APIConnectionError,
  APITimeoutError,
  AuthenticationError,
  ValidationError,
  type APIErrorInit,
} from '../src/errors.js';

type ApiErrorCtor = new (init: APIErrorInit) => Error;

function apiErr(Cls: ApiErrorCtor, status: number): Error {
  return new Cls({ status, message: 'x' });
}

describe('retry', () => {
  it('backoff is monotonic ignoring jitter', () => {
    const d = (a: number) => computeBackoff(a, { base: 500, cap: 8000, jitter: 1.5 });
    expect(d(0)).toBeLessThanOrEqual(d(1));
    expect(d(1)).toBeLessThanOrEqual(d(2));
    expect(d(2)).toBeLessThanOrEqual(d(3));
  });

  it('backoff is capped', () => {
    const d = computeBackoff(20, { base: 500, cap: 8000, jitter: 1.0 });
    expect(d).toBeLessThanOrEqual(8000);
  });

  it('GET retries on 429, 5xx, connection, timeout', () => {
    for (const err of [
      apiErr(RateLimitError, 429),
      apiErr(ServerError, 500),
      apiErr(ServerError, 502),
      apiErr(ServerError, 503),
      apiErr(ServerError, 504),
      new APIConnectionError('x'),
      new APITimeoutError('x'),
    ]) {
      expect(shouldRetry({ method: 'GET', error: err as Error, beforeSend: false })).toBe(true);
    }
  });

  it('GET does NOT retry 4xx except 429', () => {
    for (const err of [
      apiErr(ConflictError, 409),
      apiErr(NotFoundError, 404),
      apiErr(ValidationError, 400),
      apiErr(AuthenticationError, 401),
    ]) {
      expect(shouldRetry({ method: 'GET', error: err as Error, beforeSend: false })).toBe(false);
    }
  });

  it('POST retries only 429 and pre-send connection error', () => {
    expect(shouldRetry({ method: 'POST', error: apiErr(RateLimitError, 429), beforeSend: false })).toBe(true);
    expect(shouldRetry({ method: 'POST', error: new APIConnectionError('x'), beforeSend: true })).toBe(true);
    expect(shouldRetry({ method: 'POST', error: apiErr(ServerError, 500), beforeSend: false })).toBe(false);
    expect(shouldRetry({ method: 'POST', error: new APIConnectionError('x'), beforeSend: false })).toBe(false);
    expect(shouldRetry({ method: 'POST', error: new APITimeoutError('x'), beforeSend: false })).toBe(false);
    expect(shouldRetry({ method: 'POST', error: apiErr(ConflictError, 409), beforeSend: false })).toBe(false);
  });

  it('delayFor honors rate-limit retryAfter in seconds and returns ms', () => {
    const err = new RateLimitError({ status: 429, retryAfter: 5 });
    const d = delayFor({ attempt: 0, error: err, base: 500, cap: 8000, jitter: 1.0 });
    expect(d).toBe(5000);
  });

  it('delayFor falls back to backoff when no retryAfter', () => {
    const err = new RateLimitError({ status: 429 });
    const d = delayFor({ attempt: 0, error: err, base: 500, cap: 8000, jitter: 1.0 });
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(1000);
  });
});
