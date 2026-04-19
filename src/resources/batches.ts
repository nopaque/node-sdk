import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  Batch,
  BatchesListParams,
  BatchRun,
  CreateBatchRequest,
  UpdateBatchRequest,
} from '../types/batches.js';

const RUN_TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export interface BatchesWaitForOptions {
  timeout?: number;
  pollInterval?: number;
  intervalCap?: number;
  onUpdate?: (run: BatchRun) => void;
  requestOptions?: RequestOptions;
}

export class BatchesResource extends Resource {
  async create(
    body: CreateBatchRequest,
    requestOptions?: RequestOptions
  ): Promise<Batch> {
    return await this.transport.request('POST', '/testing/batches', { body, requestOptions });
  }

  list(
    params: BatchesListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<Batch> {
    return new Paginator<Batch>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/batches', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listPage(
    params: BatchesListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<Batch>> {
    const raw = await this.transport.request<{ items: Batch[]; nextToken: string | null }>(
      'GET', '/testing/batches', { params, requestOptions }
    );
    return new Page(raw.items, raw.nextToken);
  }

  async get(batchId: string, requestOptions?: RequestOptions): Promise<Batch> {
    return await this.transport.request('GET', `/testing/batches/${batchId}`, { requestOptions });
  }

  async update(
    batchId: string,
    body: UpdateBatchRequest,
    requestOptions?: RequestOptions
  ): Promise<Batch> {
    return await this.transport.request('PUT', `/testing/batches/${batchId}`, {
      body,
      requestOptions,
    });
  }

  async delete(batchId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/batches/${batchId}`, { requestOptions });
  }

  async run(
    batchId: string,
    requestOptions?: RequestOptions
  ): Promise<BatchRun> {
    return await this.transport.request('POST', `/testing/batches/${batchId}/run`, {
      requestOptions,
    });
  }

  runs(
    batchId: string,
    params: BatchesListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<BatchRun> {
    return new Paginator<BatchRun>({
      fetchPage: async (p) =>
        await this.transport.request('GET', `/testing/batches/${batchId}/runs`, {
          params: p,
          requestOptions,
        }),
      params: { ...params },
    });
  }

  listRuns(
    params: BatchesListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<BatchRun> {
    return new Paginator<BatchRun>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/batch-runs', {
          params: p,
          requestOptions,
        }),
      params: { ...params },
    });
  }

  async getRun(runId: string, requestOptions?: RequestOptions): Promise<BatchRun> {
    return await this.transport.request('GET', `/testing/batch-runs/${runId}`, { requestOptions });
  }

  async waitForRun(
    runId: string,
    opts: BatchesWaitForOptions = {}
  ): Promise<BatchRun> {
    return await waitFor<BatchRun>({
      fetch: () => this.getRun(runId, opts.requestOptions),
      isTerminal: (run) => RUN_TERMINAL_STATUSES.has(run.status),
      timeout: opts.timeout,
      initialInterval: opts.pollInterval,
      intervalCap: opts.intervalCap,
      onUpdate: opts.onUpdate,
    });
  }
}
