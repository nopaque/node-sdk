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

export interface PaginatorOptions<T, Raw = unknown> {
  fetchPage: (params: PaginatorParams) => Promise<{ items: Raw[]; nextToken: string | null }>;
  params: PaginatorParams;
  mapItem?: (raw: Raw) => T;
}

export class Paginator<T, Raw = unknown> implements AsyncIterable<T> {
  constructor(private readonly options: PaginatorOptions<T, Raw>) {}

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    const limit = this.options.params.limit;
    const params: PaginatorParams = { ...this.options.params };
    let yielded = 0;
    while (true) {
      const page = await this.options.fetchPage(params);
      for (const raw of page.items) {
        const item = (this.options.mapItem ? this.options.mapItem(raw) : (raw as unknown as T));
        yield item;
        yielded++;
        if (limit !== undefined && yielded >= limit) return;
      }
      if (!page.nextToken) return;
      params.nextToken = page.nextToken;
    }
  }
}
