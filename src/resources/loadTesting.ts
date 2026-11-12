import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateLoadTestRequest,
  CreateReportRequest,
  FailurePatternCall,
  FailurePatternCallListParams,
  FailurePatternScopeParams,
  LoadTestExport,
  LoadTestFailurePatterns,
  ReclassifyFailurePatternsResponse,
  Report,
  ReportFileDownload,
  ReportListParams,
  ReportPack,
  LoadTest,
  LoadTestEstimate,
  LoadTestEstimateRequest,
  LoadTestRun,
  LoadTestStatusResponse,
  LoadTestingListParams,
  UpdateLoadTestRequest,
} from '../types/loadTesting.js';

type ReportsPage = { reports?: Report[]; items?: Report[]; nextCursor?: string | null };
type PatternCallsPage = {
  items?: FailurePatternCall[];
  cursor?: string | null;
  nextToken?: string | null;
};

// These list routes page on `cursor`; the paginator advances by writing
// `nextToken`, so it wins over a caller-supplied `cursor`.
function cursorQuery<P extends { nextToken?: string | null; cursor?: string }>(params: P) {
  const { nextToken, cursor, ...rest } = params;
  return { ...rest, cursor: nextToken ?? cursor };
}

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
    // POST /testing/load-tests returns `{ config: {...} }` — unwrap.
    const raw = await this.transport.request<{ config?: LoadTest } & LoadTest>(
      'POST', '/testing/load-tests', { body, requestOptions }
    );
    return raw.config ?? raw;
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
      itemsKey: 'configs',
    });
  }

  async listPage(
    params: LoadTestingListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<LoadTest>> {
    const raw = await this.transport.request<{
      configs?: LoadTest[];
      items?: LoadTest[];
      nextToken?: string | null;
    }>('GET', '/testing/load-tests', { params, requestOptions });
    return new Page(raw.configs ?? raw.items ?? [], raw.nextToken ?? null);
  }

  async get(loadTestId: string, requestOptions?: RequestOptions): Promise<LoadTest> {
    // GET /testing/load-tests/{id} returns the config fields flat with a
    // `testConfig` sibling — not wrapped.
    return await this.transport.request('GET', `/testing/load-tests/${loadTestId}`, {
      requestOptions,
    });
  }

  async update(
    loadTestId: string,
    body: UpdateLoadTestRequest,
    requestOptions?: RequestOptions
  ): Promise<LoadTest> {
    // PUT returns `{ config: updated }` — unwrap.
    const raw = await this.transport.request<{ config?: LoadTest } & LoadTest>(
      'PUT', `/testing/load-tests/${loadTestId}`, { body, requestOptions }
    );
    return raw.config ?? raw;
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
      itemsKey: 'runs',
    });
  }

  // -------------------------------------------------------------------------
  // Detailed reports over finished runs
  // -------------------------------------------------------------------------

  /**
   * POST /testing/reports — start building a report over 1 to 20 finished
   * load-test runs. It starts `pending`; poll `getReport()` until `ready` or
   * `failed`, then fetch each file with `getReportFileUrl()`.
   */
  async createReport(
    body: CreateReportRequest,
    requestOptions?: RequestOptions
  ): Promise<Report> {
    const raw = await this.transport.request<{ report: Report }>('POST', '/testing/reports', {
      body,
      requestOptions,
    });
    return raw.report;
  }

  /** GET /testing/reports — the workspace's reports, newest first. */
  listReports(
    params: ReportListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<Report> {
    return new Paginator<Report>({
      fetchPage: async (p) => {
        const raw = await this.transport.request<ReportsPage>('GET', '/testing/reports', {
          params: cursorQuery(p as ReportListParams),
          requestOptions,
        });
        return { items: raw.reports ?? raw.items ?? [], nextToken: raw.nextCursor ?? null };
      },
      params: { ...params },
    });
  }

  /** One page of `listReports()`. */
  async listReportsPage(
    params: ReportListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<Report>> {
    const raw = await this.transport.request<ReportsPage>('GET', '/testing/reports', {
      params: cursorQuery(params),
      requestOptions,
    });
    return new Page(raw.reports ?? raw.items ?? [], raw.nextCursor ?? null);
  }

  /** GET /testing/reports/{reportId}. */
  async getReport(reportId: string, requestOptions?: RequestOptions): Promise<Report> {
    const raw = await this.transport.request<{ report: Report }>(
      'GET', `/testing/reports/${encodeURIComponent(reportId)}`, { requestOptions }
    );
    return raw.report;
  }

  /**
   * DELETE /testing/reports/{reportId} — permanently delete a finished report
   * (`ready` or `failed`) and its files. The runs it covered are not touched.
   */
  async deleteReport(reportId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/reports/${encodeURIComponent(reportId)}`, { requestOptions });
  }

  /**
   * GET /testing/reports/{reportId}/files/{pack} — a pre-signed link to one
   * built file, valid for 1 hour. Call again for a fresh link.
   */
  async getReportFileUrl(
    reportId: string,
    pack: ReportPack,
    requestOptions?: RequestOptions
  ): Promise<ReportFileDownload> {
    return await this.transport.request('GET', `/testing/reports/${encodeURIComponent(reportId)}/files/${encodeURIComponent(pack)}`, {
      requestOptions,
    });
  }

  // -------------------------------------------------------------------------
  // Run exports. `runId` is a load-test RUN id, as for `status()`.
  // -------------------------------------------------------------------------

  /**
   * POST /testing/load-tests/{id}/exports — start building a zip of every
   * call and step in the run. If an export of the run is already in progress,
   * that one is returned instead. Poll `getExport()` until `ready`.
   */
  async createExport(runId: string, requestOptions?: RequestOptions): Promise<LoadTestExport> {
    const raw = await this.transport.request<{ export: LoadTestExport }>(
      'POST', `/testing/load-tests/${encodeURIComponent(runId)}/exports`, { requestOptions }
    );
    return raw.export;
  }

  /** GET /testing/load-tests/{id}/exports — the run's exports, newest first (at most 20). */
  async listExports(runId: string, requestOptions?: RequestOptions): Promise<LoadTestExport[]> {
    const raw = await this.transport.request<{ exports?: LoadTestExport[] }>(
      'GET', `/testing/load-tests/${encodeURIComponent(runId)}/exports`, { requestOptions }
    );
    return raw.exports ?? [];
  }

  /**
   * GET /testing/load-tests/{id}/exports/{exportId}. When `ready`,
   * `downloadUrl` is valid for 1 hour; call again for a fresh one.
   */
  async getExport(
    runId: string,
    exportId: string,
    requestOptions?: RequestOptions
  ): Promise<LoadTestExport> {
    const raw = await this.transport.request<{ export: LoadTestExport }>(
      'GET', `/testing/load-tests/${encodeURIComponent(runId)}/exports/${encodeURIComponent(exportId)}`, { requestOptions }
    );
    return raw.export;
  }

  // -------------------------------------------------------------------------
  // Failure patterns. `runId` is a load-test RUN id.
  // -------------------------------------------------------------------------

  /** GET /testing/load-tests/{id}/failure-patterns — the run's failed calls grouped by pattern. */
  async getFailurePatterns(
    runId: string,
    params: FailurePatternScopeParams = {},
    requestOptions?: RequestOptions
  ): Promise<LoadTestFailurePatterns> {
    return await this.transport.request('GET', `/testing/load-tests/${encodeURIComponent(runId)}/failure-patterns`, {
      params,
      requestOptions,
    });
  }

  /**
   * POST /testing/load-tests/{id}/failure-patterns/reclassify — rerun the
   * current rules over the run's calls in the background. Returns at once.
   */
  async reclassifyFailurePatterns(
    runId: string,
    params: FailurePatternScopeParams = {},
    requestOptions?: RequestOptions
  ): Promise<ReclassifyFailurePatternsResponse> {
    return await this.transport.request(
      'POST', `/testing/load-tests/${encodeURIComponent(runId)}/failure-patterns/reclassify`, { params, requestOptions }
    );
  }

  /**
   * GET /testing/load-tests/{id}/failure-patterns/{patternId}/calls — the
   * calls in one pattern, oldest first. `LATE_START` lists late starts.
   */
  listFailurePatternCalls(
    runId: string,
    patternId: string,
    params: FailurePatternCallListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<FailurePatternCall> {
    const path = `/testing/load-tests/${encodeURIComponent(runId)}/failure-patterns/${encodeURIComponent(patternId)}/calls`;
    return new Paginator<FailurePatternCall>({
      fetchPage: async (p) => {
        const raw = await this.transport.request<PatternCallsPage>('GET', path, {
          params: cursorQuery(p as FailurePatternCallListParams),
          requestOptions,
        });
        return { items: raw.items ?? [], nextToken: raw.cursor ?? raw.nextToken ?? null };
      },
      params: { ...params },
    });
  }

  /** One page of `listFailurePatternCalls()`. */
  async listFailurePatternCallsPage(
    runId: string,
    patternId: string,
    params: FailurePatternCallListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<FailurePatternCall>> {
    const raw = await this.transport.request<PatternCallsPage>(
      'GET',
      `/testing/load-tests/${encodeURIComponent(runId)}/failure-patterns/${encodeURIComponent(patternId)}/calls`,
      { params: cursorQuery(params), requestOptions }
    );
    return new Page(raw.items ?? [], raw.cursor ?? raw.nextToken ?? null);
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
