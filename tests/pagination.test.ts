import { describe, it, expect } from 'vitest';
import { Paginator, Page } from '../src/pagination.js';

async function collect<T>(p: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of p) out.push(x);
  return out;
}

describe('Paginator', () => {
  it('follows nextToken across pages', async () => {
    const calls: Record<string, unknown>[] = [];
    const p = new Paginator<number>({
      fetchPage: async (params) => {
        calls.push(params);
        if (!params.nextToken) return { items: [1, 2], nextToken: 't1' };
        if (params.nextToken === 't1') return { items: [3, 4], nextToken: 't2' };
        return { items: [5], nextToken: null };
      },
      params: {},
    });
    expect(await collect(p)).toEqual([1, 2, 3, 4, 5]);
    expect(calls.length).toBe(3);
  });

  it('respects caller limit', async () => {
    const p = new Paginator<number>({
      fetchPage: async () => ({ items: [1, 2, 3, 4, 5], nextToken: null }),
      params: { limit: 3 },
    });
    expect(await collect(p)).toEqual([1, 2, 3]);
  });

  it('handles empty pages', async () => {
    const p = new Paginator<number>({
      fetchPage: async () => ({ items: [], nextToken: null }),
      params: {},
    });
    expect(await collect(p)).toEqual([]);
  });

  it('Page carries items and nextToken', () => {
    const p = new Page<number>([1, 2], 'tok');
    expect(p.items).toEqual([1, 2]);
    expect(p.nextToken).toBe('tok');
  });
});
