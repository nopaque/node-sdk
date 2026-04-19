import { describe, it, expect, beforeEach } from 'vitest';
import { Nopaque } from '../src/index.js';
import { NopaqueConfigError } from '../src/errors.js';

describe('Nopaque', () => {
  beforeEach(() => {
    delete process.env.NOPAQUE_API_KEY;
  });

  it('throws without api key', () => {
    expect(() => new Nopaque()).toThrow(NopaqueConfigError);
  });

  it('exposes resource namespaces', () => {
    const c = new Nopaque({ apiKey: 'k' });
    expect(c.mapping).toBeDefined();
    expect(c.audio).toBeDefined();
    expect(c.profiles).toBeDefined();
    expect(c.testing).toBeDefined();
    expect(c.batches).toBeDefined();
    expect(c.sweeps).toBeDefined();
    expect(c.datasets).toBeDefined();
    expect(c.loadTesting).toBeDefined();
    expect(c.scheduler).toBeDefined();
    expect(c.enrichment).toBeDefined();
  });

  it('exposes VERSION export', async () => {
    const { VERSION } = await import('../src/index.js');
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });
});
