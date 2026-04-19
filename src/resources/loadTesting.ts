import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateLoadTestRequest,
  LoadTest,
  LoadTestEstimate,
  LoadTestEstimateRequest,
  LoadTestRun,
  LoadTestStatusResponse,
  LoadTestingListParams,
  UpdateLoadTestRequest,
} from '../types/loadTesting.js';

const TERMINAL_STATUSES = new Set(['completed', 'aborted', 'failed']);

export interface LoadTestingWaitForOptions {
  timeout?: number;
  pollInterval?: number;
  intervalCap?: number;
  onUpdate?: (status: LoadTestStatusResponse) => void;
  requestOptions?: RequestOptions;
}

export class LoadTestingResource extends Resource {
  async create(
    body: CreateLoadTestRequest,
    requestOptions?: RequestOptions
  ): Promise<LoadTest> {
    return await this.transport.request('POST', '/testing/load-tests', { body, requestOptions });
  }

  list(
    params: LoadTestingListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<LoadTest> {
    return new Paginator<LoadTest>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/load-tests', {
          params: p,
          requestOptions,
        }),
      params: { ...params },
    });
  }

  async listPage(
    params: LoadTestingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<LoadTest>> {
    const raw = await this.transport.request<{ items: LoadTest[]; nextToken: string | null }>(
      'GET', '/testing/load-tests', { params, requestOptions }
    );
    return new Page(raw.items, raw.nextToken);
  }

  async get(loadTestId: string, requestOptions?: RequestOptions): Promise<LoadTest> {
    return await this.transport.request('GET', `/testing/load-tests/${loadTestId}`, {
      requestOptions,
    });
  }

  async update(
    loadTestId: string,
    body: UpdateLoadTestRequest,
    requestOptions?: RequestOptions
  ): Promise<LoadTest> {
    return await this.transport.request('PUT', `/testing/load-tests/${loadTestId}`, {
      body,
      requestOptions,
    });
  }

  async delete(loadTestId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/load-tests/${loadTestId}`, { requestOptions });
  }

  async estimate(
    body: LoadTestEstimateRequest,
    requestOptions?: RequestOptions
  ): Promise<LoadTestEstimate> {
    return await this.transport.request('POST', '/testing/load-tests/estimate', {
      body,
      requestOptions,
    });
  }

  async start(
    loadTestId: string,
    requestOptions?: RequestOptions
  ): Promise<LoadTest> {
    return await this.transport.request('POST', `/testing/load-tests/${loadTestId}/start`, {
      requestOptions,
    });
  }

  async abort(
    loadTestId: string,
    requestOptions?: RequestOptions
  ): Promise<LoadTest> {
    return await this.transport.request('POST', `/testing/load-tests/${loadTestId}/abort`, {
      requestOptions,
    });
  }

  async status(
    loadTestId: string,
    requestOptions?: RequestOptions
  ): Promise<LoadTestStatusResponse> {
    return await this.transport.request('GET', `/testing/load-tests/${loadTestId}/status`, {
      requestOptions,
    });
  }

  listRuns(
    params: LoadTestingListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<LoadTestRun> {
    return new Paginator<LoadTestRun>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/load-tests/runs', {
          params: p,
          requestOptions,
        }),
      params: { ...params },
    });
  }

  async waitForComplete(
    loadTestId: string,
    opts: LoadTestingWaitForOptions = {}
  ): Promise<LoadTestStatusResponse> {
    return await waitFor<LoadTestStatusResponse>({
      fetch: () => this.status(loadTestId, opts.requestOptions),
      isTerminal: (s) => TERMINAL_STATUSES.has(s.status),
      timeout: opts.timeout,
      initialInterval: opts.pollInterval,
      intervalCap: opts.intervalCap,
      onUpdate: opts.onUpdate,
    });
  }
}
