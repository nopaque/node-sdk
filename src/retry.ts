import {
  APIConnectionError,
  APITimeoutError,
  NopaqueAPIError,
  NopaqueError,
  RateLimitError,
  ServerError,
} from './errors.js';

export interface BackoffParams {
  base?: number;   // ms
  cap?: number;    // ms
  jitter?: number; // upper multiplier
}

const DEFAULTS: Required<BackoffParams> = { base: 500, cap: 8000, jitter: 1.5 };

export function computeBackoff(attempt: number, p: BackoffParams = {}): number {
  const { base, cap, jitter } = { ...DEFAULTS, ...p };
  const raw = Math.min(cap, base * 2 ** attempt);
  const mul = 0.5 + Math.random() * (jitter - 0.5);
  return Math.round(raw * mul);
}

export function delayFor(args: {
  attempt: number;
  error: NopaqueError;
  base?: number;
  cap?: number;
  jitter?: number;
}): number {
  const { attempt, error, ...p } = args;
  if (error instanceof RateLimitError && error.retryAfter !== null) {
    return Math.round(error.retryAfter * 1000);
  }
  return computeBackoff(attempt, p);
}

export interface ShouldRetryArgs {
  method: string;
  error: NopaqueError;
  beforeSend: boolean;
}

export function shouldRetry({ method, error, beforeSend }: ShouldRetryArgs): boolean {
  const m = method.toUpperCase();
  if (error instanceof RateLimitError) return true;
  if (m === 'POST') {
    return error instanceof APIConnectionError && beforeSend;
  }
  if (
    error instanceof APIConnectionError ||
    error instanceof APITimeoutError ||
    error instanceof ServerError
  ) {
    return true;
  }
  if (error instanceof NopaqueAPIError) return false;
  return false;
}
