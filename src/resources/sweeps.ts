import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateSweepRequest,
  Sweep,
  SweepRun,
  SweepsListParams,
  UpdateSweepRequest,
} from '../types/sweeps.js';

const RUN_TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export interface SweepsWaitForOptions {
  timeout?: number;
  pollInterval?: number;
  intervalCap?: number;
  onUpdate?: (run: SweepRun) => void;
  requestOptions?: RequestOptions;
}

export class SweepsResource extends Resource {
  async create(
    body: CreateSweepRequest,
    requestOptions?: RequestOptions
  ): Promise<Sweep> {
    return await this.transport.request('POST', '/testing/sweeps', { body, requestOptions });
  }

  list(
    params: SweepsListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<Sweep> {
    return new Paginator<Sweep>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/sweeps', { params: p, requestOptions }),
      params: { ...params },
      itemsKey: 'sweeps',
    });
  }

  async listPage(
    params: SweepsListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<Sweep>> {
    const raw = await this.transport.request<{
      sweeps?: Sweep[];
      items?: Sweep[];
      nextToken?: string | null;
    }>('GET', '/testing/sweeps', { params, requestOptions });
    return new Page(raw.sweeps ?? raw.items ?? [], raw.nextToken ?? null);
  }

  async get(sweepId: string, requestOptions?: RequestOptions): Promise<Sweep> {
    return await this.transport.request('GET', `/testing/sweeps/${sweepId}`, { requestOptions });
  }

  async update(
    sweepId: string,
    body: UpdateSweepRequest,
    requestOptions?: RequestOptions
  ): Promise<Sweep> {
    return await this.transport.request('PUT', `/testing/sweeps/${sweepId}`, {
      body,
      requestOptions,
    });
  }

  async delete(sweepId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/sweeps/${sweepId}`, { requestOptions });
  }

  async run(
    sweepId: string,
    requestOptions?: RequestOptions
  ): Promise<SweepRun> {
    return await this.transport.request('POST', `/testing/sweeps/${sweepId}/run`, {
      requestOptions,
    });
  }

  runs(
    sweepId: string,
    params: SweepsListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<SweepRun> {
    return new Paginator<SweepRun>({
      fetchPage: async (p) =>
        await this.transport.request('GET', `/testing/sweeps/${sweepId}/runs`, {
          params: p,
          requestOptions,
        }),
      params: { ...params },
      itemsKey: 'runs',
    });
  }

  listRuns(
    params: SweepsListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<SweepRun> {
    return new Paginator<SweepRun>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/sweep-runs', {
          params: p,
          requestOptions,
        }),
      params: { ...params },
      itemsKey: 'runs',
    });
  }

  async getRun(runId: string, requestOptions?: RequestOptions): Promise<SweepRun> {
    return await this.transport.request('GET', `/testing/sweep-runs/${runId}`, { requestOptions });
  }

  async waitForRun(
    runId: string,
    opts: SweepsWaitForOptions = {}
  ): Promise<SweepRun> {
    return await waitFor<SweepRun>({
      fetch: () => this.getRun(runId, opts.requestOptions),
      isTerminal: (run) => RUN_TERMINAL_STATUSES.has(run.status),
      timeout: opts.timeout,
      initialInterval: opts.pollInterval,
      intervalCap: opts.intervalCap,
      onUpdate: opts.onUpdate,
    });
  }
}
