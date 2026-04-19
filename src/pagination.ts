export class Page<T> {
  constructor(public readonly items: T[], public readonly nextToken: string | null) {}
}

export interface PageResponse<T> {
  items: T[];
  nextToken: string | null;
}

export interface PaginatorParams {
  limit?: number;
  nextToken?: string | null;
  [key: string]: unknown;
}

/**
 * A page may be returned in either of two shapes:
 *   { items: [...], nextToken: ... }         — the standard shape
 *   { <itemsKey>: [...], nextToken?: ... }   — the resource-named shape
 * When `itemsKey` is provided, the paginator prefers that key but falls back
 * to `items` for forward compatibility.
 */
export interface PaginatorOptions<T, Raw = unknown> {
  fetchPage: (params: PaginatorParams) => Promise<Record<string, unknown>>;
  params: PaginatorParams;
  mapItem?: (raw: Raw) => T;
  itemsKey?: string;
}

export class Paginator<T, Raw = unknown> implements AsyncIterable<T> {
  constructor(private readonly options: PaginatorOptions<T, Raw>) {}

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    const limit = this.options.params.limit;
    const params: PaginatorParams = { ...this.options.params };
    const key = this.options.itemsKey;
    let yielded = 0;
    while (true) {
      const page = await this.options.fetchPage(params);
      const rawItems = (key ? (page as Record<string, unknown>)[key] : undefined)
        ?? (page as Record<string, unknown>).items
        ?? [];
      const items = rawItems as Raw[];
      for (const raw of items) {
        const item = (this.options.mapItem ? this.options.mapItem(raw) : (raw as unknown as T));
        yield item;
        yielded++;
        if (limit !== undefined && yielded >= limit) return;
      }
      const nextToken = (page as Record<string, unknown>).nextToken as string | null | undefined;
      if (!nextToken) return;
      params.nextToken = nextToken;
    }
  }
}
