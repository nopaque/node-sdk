import { NopaqueConfigError, type NopaqueError } from './errors.js';

export { NopaqueConfigError };

export interface NopaqueOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  defaultHeaders?: Record<string, string>;
  onRetry?: (attempt: number, error: NopaqueError, nextDelayMs: number) => void;
  fetch?: typeof globalThis.fetch;
}

export interface ResolvedConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly defaultHeaders: Record<string, string>;
  readonly onRetry?: (attempt: number, error: NopaqueError, nextDelayMs: number) => void;
  readonly fetch: typeof globalThis.fetch;
}

const DEFAULT_BASE_URL = 'https://api.nopaque.co.uk';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 3;

export function resolveConfig(opts: NopaqueOptions): ResolvedConfig {
  const apiKey = opts.apiKey ?? process.env.NOPAQUE_API_KEY ?? '';
  if (!apiKey) {
    throw new NopaqueConfigError(
      'No API key provided. Pass apiKey in the constructor or set NOPAQUE_API_KEY.'
    );
  }
  const baseUrl = (
    opts.baseUrl ?? process.env.NOPAQUE_BASE_URL ?? DEFAULT_BASE_URL
  ).replace(/\/$/, '');

  return {
    apiKey,
    baseUrl,
    timeout: opts.timeout ?? DEFAULT_TIMEOUT_MS,
    maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
    defaultHeaders: opts.defaultHeaders ?? {},
    onRetry: opts.onRetry,
    fetch: opts.fetch ?? globalThis.fetch.bind(globalThis),
  };
}
