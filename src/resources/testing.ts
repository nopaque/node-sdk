import { Resource } from '../resource.js';
import type { Transport } from '../transport.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateTestConfigRequest,
  CreateTestJobRequest,
  CreateTestRunRequest,
  ListVoicesResponse,
  MissionTestRunResponse,
  TestConfig,
  TestingListParams,
  TestJob,
  TestRun,
  TestRunDetails,
  TestRunAggregateParams,
  TestRunAggregateResponse,
  TestRunListItem,
  TestRunListParams,
  UpdateTestConfigRequest,
} from '../types/testing.js';

const RUN_TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

/**
 * Has the run finished AND had its verdict written?
 *
 * A run can be marked terminal before its outcome lands. The container emits
 * `run_status_changed{status:'completed'}` and `run_completed{outcome}` as
 * separate SQS messages, and SQS gives no ordering guarantee — the API's own
 * response-handler documents the mirror-image race (a late `running` arriving
 * after a terminal write). `updateTestRun` skips undefined fields, so a
 * `run_status_changed` carrying no outcome sets `status` terminal and leaves
 * `outcome` unwritten. Polling on status alone returns that intermediate row:
 * `outcome: undefined` and zero step results on a run that passed.
 *
 * So for `completed` we additionally require a decided verdict. `failed` and
 * `cancelled` are accepted immediately — neither is expected to carry one.
 */
function isRunSettled(run: TestRun): boolean {
  if (run.status === undefined || !RUN_TERMINAL_STATUSES.has(run.status)) return false;
  if (run.status !== 'completed') return true;
  return run.outcome != null && run.outcome !== 'pending';
}

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
    params: TestRunListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<TestRunListItem> {
    return new Paginator<TestRunListItem>({
      fetchPage: async (p) => {
        const { nextToken, cursor, ...rest } = p as TestRunListParams & { nextToken?: string };
        // Server returns { runs: [...], nextCursor? } rather than { items, nextToken }.
        const raw = await this.transport.request<{
          runs?: TestRunListItem[];
          items?: TestRunListItem[];
          nextCursor?: string | null;
          nextToken?: string | null;
        }>('GET', '/testing/runs', {
          params: { ...rest, cursor: cursor ?? nextToken },
          requestOptions,
        });
        return {
          items: raw.runs ?? raw.items ?? [],
          nextToken: raw.nextCursor ?? raw.nextToken ?? null,
        };
      },
      params: { ...params },
    });
  }

  async listPage(
    params: TestRunListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<TestRunListItem>> {
    const { nextToken, cursor, ...rest } = params;
    const raw = await this.transport.request<{
      runs?: TestRunListItem[];
      items?: TestRunListItem[];
      nextCursor?: string | null;
      nextToken?: string | null;
    }>('GET', '/testing/runs', {
      params: { ...rest, cursor: cursor ?? nextToken },
      requestOptions,
    });
    return new Page(raw.runs ?? raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  /** GET /testing/runs/aggregate — grouped counts over test runs. */
  async aggregate(
    params: TestRunAggregateParams,
    requestOptions?: RequestOptions
  ): Promise<TestRunAggregateResponse> {
    return await this.transport.request('GET', '/testing/runs/aggregate', {
      params,
      requestOptions,
    });
  }

  async get(runId: string, requestOptions?: RequestOptions): Promise<TestRunDetails> {
    return await this.transport.request('GET', `/testing/runs/${runId}`, { requestOptions });
  }

  async waitForRun(
    runId: string,
    opts: TestingWaitForOptions = {}
  ): Promise<TestRunDetails> {
    return await waitFor<TestRunDetails>({
      fetch: () => this.get(runId, opts.requestOptions),
      isTerminal: isRunSettled,
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

  /** Paginated, filtered list of test runs (alias for `testing.runs.list()`). */
  listRuns(
    params: TestRunListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<TestRunListItem> {
    return this.runs.list(params, requestOptions);
  }

  /** GET /testing/voices — operator-enabled voices a mission test may use. */
  async listVoices(requestOptions?: RequestOptions): Promise<ListVoicesResponse> {
    return await this.transport.request('GET', '/testing/voices', { requestOptions });
  }

  /** GET /testing/runs/aggregate — grouped counts over test runs. */
  async aggregateRuns(
    params: TestRunAggregateParams,
    requestOptions?: RequestOptions
  ): Promise<TestRunAggregateResponse> {
    return await this.runs.aggregate(params, requestOptions);
  }

  /** GET /testing/mission-test-runs/{id} — mission-strict run detail (no steps). */
  async getMissionTestRun(
    id: string,
    requestOptions?: RequestOptions
  ): Promise<MissionTestRunResponse> {
    return await this.transport.request('GET', `/testing/mission-test-runs/${id}`, {
      requestOptions,
    });
  }
}
