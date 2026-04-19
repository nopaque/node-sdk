import { Resource } from '../resource.js';
import type { Transport } from '../transport.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateTestConfigRequest,
  CreateTestJobRequest,
  CreateTestRunRequest,
  TestConfig,
  TestingListParams,
  TestJob,
  TestRun,
  UpdateTestConfigRequest,
} from '../types/testing.js';

const RUN_TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export interface TestingWaitForOptions {
  timeout?: number;
  pollInterval?: number;
  intervalCap?: number;
  onUpdate?: (run: TestRun) => void;
  requestOptions?: RequestOptions;
}

export class TestingConfigsResource extends Resource {
  async create(
    body: CreateTestConfigRequest,
    requestOptions?: RequestOptions
  ): Promise<TestConfig> {
    return await this.transport.request('POST', '/testing/configs', { body, requestOptions });
  }

  list(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<TestConfig> {
    return new Paginator<TestConfig>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/configs', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listPage(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<TestConfig>> {
    const raw = await this.transport.request<{ items: TestConfig[]; nextToken: string | null }>(
      'GET', '/testing/configs', { params, requestOptions }
    );
    return new Page(raw.items, raw.nextToken);
  }

  async get(configId: string, requestOptions?: RequestOptions): Promise<TestConfig> {
    return await this.transport.request('GET', `/testing/configs/${configId}`, { requestOptions });
  }

  async update(
    configId: string,
    body: UpdateTestConfigRequest,
    requestOptions?: RequestOptions
  ): Promise<TestConfig> {
    return await this.transport.request('PUT', `/testing/configs/${configId}`, {
      body,
      requestOptions,
    });
  }

  async delete(configId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/configs/${configId}`, { requestOptions });
  }
}

export class TestingJobsResource extends Resource {
  async create(
    body: CreateTestJobRequest,
    requestOptions?: RequestOptions
  ): Promise<TestJob> {
    return await this.transport.request('POST', '/testing/jobs', { body, requestOptions });
  }

  list(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<TestJob> {
    return new Paginator<TestJob>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/jobs', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listPage(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<TestJob>> {
    const raw = await this.transport.request<{ items: TestJob[]; nextToken: string | null }>(
      'GET', '/testing/jobs', { params, requestOptions }
    );
    return new Page(raw.items, raw.nextToken);
  }

  async get(jobId: string, requestOptions?: RequestOptions): Promise<TestJob> {
    return await this.transport.request('GET', `/testing/jobs/${jobId}`, { requestOptions });
  }

  async delete(jobId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/jobs/${jobId}`, { requestOptions });
  }
}

export class TestingRunsResource extends Resource {
  async create(
    body: CreateTestRunRequest,
    requestOptions?: RequestOptions
  ): Promise<TestRun> {
    return await this.transport.request('POST', '/testing/runs', { body, requestOptions });
  }

  list(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<TestRun> {
    return new Paginator<TestRun>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/runs', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listPage(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<TestRun>> {
    const raw = await this.transport.request<{ items: TestRun[]; nextToken: string | null }>(
      'GET', '/testing/runs', { params, requestOptions }
    );
    return new Page(raw.items, raw.nextToken);
  }

  async get(runId: string, requestOptions?: RequestOptions): Promise<TestRun> {
    return await this.transport.request('GET', `/testing/runs/${runId}`, { requestOptions });
  }

  async waitForRun(
    runId: string,
    opts: TestingWaitForOptions = {}
  ): Promise<TestRun> {
    return await waitFor<TestRun>({
      fetch: () => this.get(runId, opts.requestOptions),
      isTerminal: (run) => RUN_TERMINAL_STATUSES.has(run.status),
      timeout: opts.timeout,
      initialInterval: opts.pollInterval,
      intervalCap: opts.intervalCap,
      onUpdate: opts.onUpdate,
    });
  }
}

export class TestingResource extends Resource {
  readonly configs: TestingConfigsResource;
  readonly jobs: TestingJobsResource;
  readonly runs: TestingRunsResource;

  constructor(transport: Transport) {
    super(transport);
    this.configs = new TestingConfigsResource(transport);
    this.jobs = new TestingJobsResource(transport);
    this.runs = new TestingRunsResource(transport);
  }
}
