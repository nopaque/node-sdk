import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateMappingJobRequest,
  MappingJob,
  MappingListParams,
  MappingPath,
  MappingRun,
  MappingStep,
  MappingTree,
  TreeFormat,
  UpdateMappingJobRequest,
} from '../types/mapping.js';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'limited', 'cancelled']);

export interface WaitForCompleteOptions {
  timeout?: number;       // ms
  pollInterval?: number;  // ms
  intervalCap?: number;   // ms
  onUpdate?: (job: MappingJob) => void;
  requestOptions?: RequestOptions;
}

export class MappingResource extends Resource {
  list(params: MappingListParams = {}, requestOptions?: RequestOptions): Paginator<MappingJob> {
    return new Paginator<MappingJob>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/mapping', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listPage(
    params: MappingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<MappingJob>> {
    const raw = await this.transport.request<{ items: MappingJob[]; nextToken: string | null }>(
      'GET', '/mapping', { params, requestOptions }
    );
    return new Page(raw.items, raw.nextToken);
  }

  async get(jobId: string, requestOptions?: RequestOptions): Promise<MappingJob> {
    return await this.transport.request('GET', `/mapping/${jobId}`, { requestOptions });
  }

  async create(
    body: CreateMappingJobRequest,
    requestOptions?: RequestOptions
  ): Promise<MappingJob> {
    return await this.transport.request('POST', '/mapping', { body, requestOptions });
  }

  async update(
    jobId: string,
    body: UpdateMappingJobRequest,
    requestOptions?: RequestOptions
  ): Promise<MappingJob> {
    return await this.transport.request('PATCH', `/mapping/${jobId}`, { body, requestOptions });
  }

  async delete(jobId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/mapping/${jobId}`, { requestOptions });
  }

  async start(jobId: string, requestOptions?: RequestOptions): Promise<MappingJob> {
    return await this.transport.request('POST', `/mapping/${jobId}/start`, { requestOptions });
  }

  async cancel(jobId: string, requestOptions?: RequestOptions): Promise<MappingJob> {
    return await this.transport.request('POST', `/mapping/${jobId}/cancel`, { requestOptions });
  }

  async attest(
    jobId: string,
    requestOptions?: RequestOptions
  ): Promise<{ attested: boolean }> {
    return await this.transport.request('POST', '/mapping/attest', {
      body: { jobId },
      requestOptions,
    });
  }

  steps(
    jobId: string,
    params: { limit?: number; nextToken?: string } = {},
    requestOptions?: RequestOptions
  ): Paginator<MappingStep> {
    return new Paginator<MappingStep>({
      fetchPage: async (p) =>
        await this.transport.request('GET', `/mapping/${jobId}/steps`, {
          params: p,
          requestOptions,
        }),
      params: { ...params },
    });
  }

  async tree(
    jobId: string,
    opts: { format?: TreeFormat } = {},
    requestOptions?: RequestOptions
  ): Promise<MappingTree> {
    return await this.transport.request('GET', `/mapping/${jobId}/tree`, {
      params: { format: opts.format ?? 'tree' },
      requestOptions,
    });
  }

  runs(
    jobId: string,
    params: { limit?: number; nextToken?: string } = {},
    requestOptions?: RequestOptions
  ): Paginator<MappingRun> {
    return new Paginator<MappingRun>({
      fetchPage: async (p) =>
        await this.transport.request('GET', `/mapping/${jobId}/runs`, {
          params: p,
          requestOptions,
        }),
      params: { ...params },
      itemsKey: 'runs',
    });
  }

  paths(
    jobId: string,
    params: { limit?: number; nextToken?: string } = {},
    requestOptions?: RequestOptions
  ): Paginator<MappingPath> {
    return new Paginator<MappingPath>({
      fetchPage: async (p) =>
        await this.transport.request('GET', `/mapping/${jobId}/paths`, {
          params: p,
          requestOptions,
        }),
      params: { ...params },
      itemsKey: 'rules',
    });
  }

  async updatePath(
    jobId: string,
    path: string,
    body: Record<string, unknown>,
    requestOptions?: RequestOptions
  ): Promise<MappingPath> {
    return await this.transport.request(
      'PATCH',
      `/mapping/${jobId}/paths/${encodeURIComponent(path)}`,
      { body, requestOptions }
    );
  }

  async deletePath(
    jobId: string,
    path: string,
    requestOptions?: RequestOptions
  ): Promise<void> {
    await this.transport.request(
      'DELETE',
      `/mapping/${jobId}/paths/${encodeURIComponent(path)}`,
      { requestOptions }
    );
  }

  async remap(
    jobId: string,
    path: string,
    requestOptions?: RequestOptions
  ): Promise<MappingJob> {
    return await this.transport.request(
      'POST',
      `/mapping/${jobId}/remap/${encodeURIComponent(path)}`,
      { requestOptions }
    );
  }

  async probe(
    jobId: string,
    runId: string,
    body: Record<string, unknown> = {},
    requestOptions?: RequestOptions
  ): Promise<unknown> {
    return await this.transport.request(
      'POST',
      `/mapping/${jobId}/runs/${runId}/probe`,
      { body, requestOptions }
    );
  }

  async waitForComplete(
    jobId: string,
    opts: WaitForCompleteOptions = {}
  ): Promise<MappingJob> {
    return await waitFor<MappingJob>({
      fetch: () => this.get(jobId, opts.requestOptions),
      isTerminal: (job) => TERMINAL_STATUSES.has(job.status),
      timeout: opts.timeout,
      initialInterval: opts.pollInterval,
      intervalCap: opts.intervalCap,
      onUpdate: opts.onUpdate,
    });
  }
}
