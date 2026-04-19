export interface RequestOptions {
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export function mergeOptions(
  base: RequestOptions | undefined,
  override: RequestOptions | undefined
): RequestOptions {
  if (!base) return override ?? {};
  if (!override) return base;
  return {
    ...base,
    ...override,
    headers: { ...(base.headers ?? {}), ...(override.headers ?? {}) },
  };
}
