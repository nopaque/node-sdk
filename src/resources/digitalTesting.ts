import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateDigitalTestRunRequest,
  DigitalTestRun,
  DigitalTestRunListParams,
} from '../types/digitalTesting.js';

const TERMINAL: ReadonlySet<string> = new Set(['completed', 'failed', 'cancelled']);

/** Mirrors `BatchesWaitForOptions` (`src/resources/batches.ts:15-21`). */
export interface DigitalTestingWaitForOptions {
  timeout?: number;
  pollInterval?: number;
  intervalCap?: number;
  onUpdate?: (run: DigitalTestRun) => void;
  requestOptions?: RequestOptions;
}

/**
 * Digital (chat channel) test runs.
 *
 * @beta Access is limited to beta workspaces during the beta period.
 */
export class DigitalTestingResource extends Resource {
  /**
   * Queue a digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async create(
    body: CreateDigitalTestRunRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestRun> {
    // POST returns { message, run } — unwrap the run object.
    const raw = await this.transport.request<
      { message?: string; run?: DigitalTestRun } & DigitalTestRun
    >('POST', '/digital-testing/runs', { body, requestOptions });
    return raw.run ?? raw;
  }

  /**
   * Paginated list of digital test runs, newest first.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  list(
    params: DigitalTestRunListParams = {},
    requestOptions?: RequestOptions,
  ): Paginator<DigitalTestRun> {
    return new Paginator<DigitalTestRun>({
      fetchPage: async (p) => {
        const { nextToken, cursor, ...rest } = p as DigitalTestRunListParams;
        // Server returns { runs: [...], nextCursor? } rather than { items, nextToken }.
        const raw = await this.transport.request<{
          runs?: DigitalTestRun[];
          items?: DigitalTestRun[];
          nextCursor?: string | null;
          nextToken?: string | null;
        }>('GET', '/digital-testing/runs', {
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

  /**
   * One page of digital test runs.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async listPage(
    params: DigitalTestRunListParams = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<DigitalTestRun>> {
    const { nextToken, cursor, ...rest } = params;
    const raw = await this.transport.request<{
      runs?: DigitalTestRun[];
      items?: DigitalTestRun[];
      nextCursor?: string | null;
      nextToken?: string | null;
    }>('GET', '/digital-testing/runs', {
      params: { ...rest, cursor: cursor ?? nextToken },
      requestOptions,
    });
    return new Page(raw.runs ?? raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  /**
   * Get one digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async get(runId: string, requestOptions?: RequestOptions): Promise<DigitalTestRun> {
    return await this.transport.request('GET', `/digital-testing/runs/${runId}`, {
      requestOptions,
    });
  }

  /**
   * Cancel a digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async cancel(runId: string, requestOptions?: RequestOptions): Promise<DigitalTestRun> {
    return await this.transport.request('POST', `/digital-testing/runs/${runId}/cancel`, {
      requestOptions,
    });
  }

  /**
   * Poll until the run reaches a terminal state.
   *
   * Resolves on `completed`, `failed` and `cancelled` alike and returns the run.
   * A bot that behaved badly is `completed` with `outcome: 'fail'`, which is a
   * RESULT, not an error — this never throws on it. `failed` means the test could
   * not be delivered.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async waitForRun(
    runId: string,
    opts: DigitalTestingWaitForOptions = {},
  ): Promise<DigitalTestRun> {
    return await waitFor<DigitalTestRun>({
      fetch: () => this.get(runId, opts.requestOptions),
      isTerminal: (r) => TERMINAL.has(r.status),
      timeout: opts.timeout,
      initialInterval: opts.pollInterval,
      intervalCap: opts.intervalCap,
      onUpdate: opts.onUpdate,
    });
  }
}
