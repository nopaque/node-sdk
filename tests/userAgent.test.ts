import { describe, it, expect } from 'vitest';
import { composeUserAgent } from '../src/userAgent.js';

describe('composeUserAgent', () => {
  it('starts with sdk name and version', () => {
    const ua = composeUserAgent();
    expect(ua).toMatch(/^nopaque-node\/\d/);
    expect(ua).toContain('node/');
  });
});
