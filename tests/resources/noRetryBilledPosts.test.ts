import { describe, it, expect, vi } from 'vitest';
import { Nopaque } from '../../src/index.js';

// A dropped connection leaves the transport unable to tell whether the server
// acted, and an ordinary POST is retried in that case. These three POSTs spend
// money or place calls, so they must never be retried, whatever maxRetries is.
function droppingClient() {
  const fetch = vi.fn(async () => {
    throw new TypeError('socket hang up');
  });
  return { fetch, c: new Nopaque({ apiKey: 'k', fetch, maxRetries: 3 }) };
}

describe('billed and call-placing POSTs are never retried', () => {
  it('numbers.order', async () => {
    const { fetch, c } = droppingClient();
    await expect(
      c.numbers.order({ e164: '+447700900000', numberType: 'survey', country: 'GB' }),
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('numbers.order ignores a caller-supplied maxRetries', async () => {
    const { fetch, c } = droppingClient();
    await expect(
      c.numbers.order(
        { e164: '+447700900000', numberType: 'survey', country: 'GB' },
        { maxRetries: 5 },
      ),
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('audio.generate', async () => {
    const { fetch, c } = droppingClient();
    await expect(c.audio.generate({ voiceId: 'v', text: 'hi' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('batches.rerun', async () => {
    const { fetch, c } = droppingClient();
    await expect(c.batches.rerun('br_1')).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
