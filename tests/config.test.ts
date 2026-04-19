import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { resolveConfig, NopaqueConfigError } from '../src/config.js';

describe('resolveConfig', () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.NOPAQUE_API_KEY;
    delete process.env.NOPAQUE_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...ORIG_ENV };
  });

  it('uses explicit api key', () => {
    const cfg = resolveConfig({ apiKey: 'nop_live_a' });
    expect(cfg.apiKey).toBe('nop_live_a');
  });

  it('reads api key from env', () => {
    process.env.NOPAQUE_API_KEY = 'nop_live_env';
    const cfg = resolveConfig({});
    expect(cfg.apiKey).toBe('nop_live_env');
  });

  it('explicit overrides env', () => {
    process.env.NOPAQUE_API_KEY = 'env';
    const cfg = resolveConfig({ apiKey: 'explicit' });
    expect(cfg.apiKey).toBe('explicit');
  });

  it('throws when no api key', () => {
    expect(() => resolveConfig({})).toThrow(NopaqueConfigError);
  });

  it('defaults base url', () => {
    const cfg = resolveConfig({ apiKey: 'k' });
    expect(cfg.baseUrl).toBe('https://api.nopaque.co.uk');
  });

  it('reads base url from env', () => {
    process.env.NOPAQUE_BASE_URL = 'https://api.dev.nopaque.co.uk';
    const cfg = resolveConfig({ apiKey: 'k' });
    expect(cfg.baseUrl).toBe('https://api.dev.nopaque.co.uk');
  });

  it('strips trailing slash', () => {
    const cfg = resolveConfig({ apiKey: 'k', baseUrl: 'https://api.nopaque.co.uk/' });
    expect(cfg.baseUrl).toBe('https://api.nopaque.co.uk');
  });

  it('has sensible defaults', () => {
    const cfg = resolveConfig({ apiKey: 'k' });
    expect(cfg.timeout).toBe(60_000);
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.defaultHeaders).toEqual({});
  });
});
