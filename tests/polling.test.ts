import { describe, it, expect } from 'vitest';
import { waitFor, pollIntervalCurve } from '../src/polling.js';
import { NopaqueTimeoutError } from '../src/errors.js';

describe('waitFor', () => {
  it('poll interval curve is monotonic and capped', () => {
    const curve = Array.from({ length: 10 }, (_, i) =>
      pollIntervalCurve(i, { base: 5000, cap: 15000 })
    );
    expect(curve[0]).toBe(5000);
    expect(curve.every((v) => v <= 15000)).toBe(true);
    expect(curve[curve.length - 1]).toBe(15000);
  });

  it('returns when isTerminal is true', async () => {
    const states = ['running', 'running', 'completed'];
    let i = 0;
    const out = await waitFor({
      fetch: async () => ({ status: states[i++] }),
      isTerminal: (d) => d.status === 'completed',
      timeout: 5000,
      initialInterval: 1,
    });
    expect(out.status).toBe('completed');
  });

  it('raises on timeout', async () => {
    await expect(
      waitFor({
        fetch: async () => ({ status: 'running' }),
        isTerminal: () => false,
        timeout: 50,
        initialInterval: 10,
      })
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });

  it('fires onUpdate for each poll', async () => {
    const seen: string[] = [];
    const states = ['running', 'completed'];
    let i = 0;
    await waitFor({
      fetch: async () => ({ status: states[i++] }),
      isTerminal: (d) => d.status === 'completed',
      timeout: 5000,
      initialInterval: 1,
      onUpdate: (d) => seen.push(d.status),
    });
    expect(seen).toEqual(['running', 'completed']);
  });
});
