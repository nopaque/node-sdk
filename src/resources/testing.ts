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
      fetchPage: async (p) => {
        // Server returns { configs: [...] } rather than { items, nextToken }.
        const raw = await this.transport.request<{
          configs?: TestConfig[];
          items?: TestConfig[];
        }>('GET', '/testing/configs', { params: p, requestOptions });
        return { items: raw.configs ?? raw.items ?? [], nextToken: null };
      },
      params: { ...params },
    });
  }

  async listPage(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<TestConfig>> {
    const raw = await this.transport.request<{
      configs?: TestConfig[];
      items?: TestConfig[];
      nextToken?: string | null;
    }>('GET', '/testing/configs', { params, requestOptions });
    return new Page(raw.configs ?? raw.items ?? [], raw.nextToken ?? null);
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
      fetchPage: async (p) => {
        // Server returns { jobs: [...] } rather than { items, nextToken }.
        const raw = await this.transport.request<{
          jobs?: TestJob[];
          items?: TestJob[];
        }>('GET', '/testing/jobs', { params: p, requestOptions });
        return { items: raw.jobs ?? raw.items ?? [], nextToken: null };
      },
      params: { ...params },
    });
  }

  async listPage(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<TestJob>> {
    const raw = await this.transport.request<{
      jobs?: TestJob[];
      items?: TestJob[];
      nextToken?: string | null;
    }>('GET', '/testing/jobs', { params, requestOptions });
    return new Page(raw.jobs ?? raw.items ?? [], raw.nextToken ?? null);
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
    // POST returns { message, run } — unwrap the run object.
    const raw = await this.transport.request<{ message?: string; run?: TestRun } & TestRun>(
      'POST', '/testing/runs', { body, requestOptions }
    );
    return raw.run ?? raw;
  }

  list(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<TestRun> {
    return new Paginator<TestRun>({
      fetchPage: async (p) => {
        // Server returns { runs: [...] } rather than { items, nextToken }.
        const raw = await this.transport.request<{
          runs?: TestRun[];
          items?: TestRun[];
        }>('GET', '/testing/runs', { params: p, requestOptions });
        return { items: raw.runs ?? raw.items ?? [], nextToken: null };
      },
      params: { ...params },
    });
  }

  async listPage(
    params: TestingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<TestRun>> {
    const raw = await this.transport.request<{
      runs?: TestRun[];
      items?: TestRun[];
      nextToken?: string | null;
    }>('GET', '/testing/runs', { params, requestOptions });
    return new Page(raw.runs ?? raw.items ?? [], raw.nextToken ?? null);
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
      isTerminal: (run) => run.status !== undefined && RUN_TERMINAL_STATUSES.has(run.status),
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
