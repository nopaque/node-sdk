import { Resource } from '../resource.js';
import type { Transport } from '../transport.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { pollIntervalCurve } from '../polling.js';
import { NopaqueTimeoutError, NotFoundError } from '../errors.js';
import type {
  CreateSurveyTestConfigRequest,
  ListSurveyResultsResponse,
  ListSurveyRunsResponse,
  ListSurveyTestConfigsResponse,
  StartSurveyTestParams,
  StartSurveyTestRequest,
  StartSurveyTestResponse,
  SurveyResult,
  SurveyResultListParams,
  SurveyResultSummary,
  SurveyTestConfig,
  SurveyTestConfigListItem,
  UpdateSurveyTestConfigRequest,
} from '../types/surveys.js';

/** The list response plus the `items`/`nextToken` aliases kept for forward compatibility. */
type ListResultsRaw = Partial<ListSurveyResultsResponse> & {
  items?: SurveyResultSummary[];
  nextToken?: string | null;
};

const TERMINAL_CAPTURE: ReadonlySet<string> = new Set(['final', 'failed']);

/** How long a result may 404 before that is believed. The row is written asynchronously. */
const DEFAULT_NOT_FOUND_GRACE = 60_000;

/** Added to `expiresAt` for the default deadline, to let the finaliser capture the conversation. */
const CAPTURE_GRACE = 600_000;

/** All durations in ms, like every other wait helper in this SDK. */
export interface SurveysWaitForResultOptions {
  /**
   * Overall deadline. Defaults to the test's `expiresAt` plus 10 minutes, read
   * from the first successful fetch.
   */
  timeout?: number;
  pollInterval?: number;
  intervalCap?: number;
  /** How long a 404 counts as "not written yet". Defaults to 60 s. */
  notFoundGrace?: number;
  onUpdate?: (result: SurveyResult) => void;
  requestOptions?: RequestOptions;
}

/** Results of survey tests, kept after a test ends however it ended. */
export class SurveyResultsResource extends Resource {
  /** Paginated list of result summaries, newest first. Transcripts are omitted. */
  list(
    params: SurveyResultListParams = {},
    requestOptions?: RequestOptions,
  ): Paginator<SurveyResultSummary> {
    return new Paginator<SurveyResultSummary>({
      fetchPage: async (p) => {
        const { nextToken, cursor, ...rest } = p as SurveyResultListParams;
        // Server returns { results: [...], nextCursor? }.
        const raw = await this.transport.request<ListResultsRaw>(
          'GET',
          '/testing/survey-results',
          {
            // `nextToken` first: the Paginator advances by writing it, and a
            // caller-supplied `cursor` would otherwise pin every page to page one.
            params: { ...rest, cursor: nextToken ?? cursor },
            requestOptions,
          },
        );
        return {
          items: raw.results ?? raw.items ?? [],
          nextToken: raw.nextCursor ?? raw.nextToken ?? null,
        };
      },
      params: { ...params },
    });
  }

  /** One page of result summaries. */
  async listPage(
    params: SurveyResultListParams = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<SurveyResultSummary>> {
    const { nextToken, cursor, ...rest } = params;
    const raw = await this.transport.request<ListResultsRaw>('GET', '/testing/survey-results', {
      params: { ...rest, cursor: nextToken ?? cursor },
      requestOptions,
    });
    return new Page(raw.results ?? raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  /**
   * One result with its conversation. While the test is live the capture may be
   * `provisional` and still grow.
   */
  async get(runId: string, requestOptions?: RequestOptions): Promise<SurveyResult> {
    return await this.transport.request('GET', `/testing/survey-results/${runId}`, {
      requestOptions,
    });
  }
}

/** Saved survey respondents. */
export class SurveyConfigsResource extends Resource {
  async create(
    body: CreateSurveyTestConfigRequest,
    requestOptions?: RequestOptions,
  ): Promise<SurveyTestConfig> {
    return await this.transport.request('POST', '/testing/survey-test-configs', {
      body,
      requestOptions,
    });
  }

  /** Every config in the workspace. Not paginated; `mission` and `acceptance` are omitted. */
  async list(requestOptions?: RequestOptions): Promise<SurveyTestConfigListItem[]> {
    const raw = await this.transport.request<Partial<ListSurveyTestConfigsResponse>>(
      'GET',
      '/testing/survey-test-configs',
      { requestOptions },
    );
    return raw.configs ?? [];
  }

  async get(configId: string, requestOptions?: RequestOptions): Promise<SurveyTestConfig> {
    return await this.transport.request('GET', `/testing/survey-test-configs/${configId}`, {
      requestOptions,
    });
  }

  /** PATCH - only the fields passed are sent. `null` clears `description`, `tags` or `voiceId`. */
  async update(
    configId: string,
    body: UpdateSurveyTestConfigRequest,
    requestOptions?: RequestOptions,
  ): Promise<SurveyTestConfig> {
    return await this.transport.request('PATCH', `/testing/survey-test-configs/${configId}`, {
      body,
      requestOptions,
    });
  }

  /** Tests already started from the config are unaffected. */
  async delete(configId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/survey-test-configs/${configId}`, {
      requestOptions,
    });
  }
}

/**
 * Survey tests. The direction is REVERSED from every other test: your platform
 * sends the survey and nopaque answers as the respondent.
 */
export class SurveysResource extends Resource {
  readonly results: SurveyResultsResource;
  readonly configs: SurveyConfigsResource;

  constructor(transport: Transport) {
    super(transport);
    this.results = new SurveyResultsResource(transport);
    this.configs = new SurveyConfigsResource(transport);
  }

  /**
   * Start a survey test. Nothing runs yet: nopaque begins WAITING for a survey
   * sent from `sender` to the returned `agentE164`, until `expiresAt`.
   *
   * Throws `ConflictError` (409) when the workspace has no live survey numbers,
   * or when every one of them is already running a test against this sender -
   * the message tells the two apart. `NotFoundError` (404) for an unknown
   * config. A 503 means the number could not be put into service and nothing
   * was reserved; it is safe to try again, but this method does not.
   */
  async start(
    params: StartSurveyTestParams,
    requestOptions?: RequestOptions,
  ): Promise<StartSurveyTestResponse> {
    const { configId, sender, windowSecs, expectedTurns, maxMessages } = params;
    const body: StartSurveyTestRequest = {
      configId,
      endUserE164: sender,
      ...(windowSecs !== undefined && { windowSecs }),
      ...(expectedTurns !== undefined && { expectedTurns }),
      ...(maxMessages !== undefined && { maxMessages }),
    };
    return await this.transport.request('POST', '/testing/survey-runs', { body, requestOptions });
  }

  /** Stop a test before its window closes, freeing its number. */
  async stop(runId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/survey-runs/${runId}`, { requestOptions });
  }

  /** Every survey test holding a number, plus how many numbers are free. Not paginated. */
  async list(requestOptions?: RequestOptions): Promise<ListSurveyRunsResponse> {
    return await this.transport.request('GET', '/testing/survey-runs', { requestOptions });
  }

  /**
   * Poll `results.get(runId)` until the capture is `final` or `failed`, and
   * return the result either way. A `failed` capture is a RESULT, not an error -
   * inspect `capture.error`.
   *
   * The result row is written asynchronously after `start()`, so a 404 is
   * treated as "not yet" for `notFoundGrace` and rethrown after that. Throws
   * `NopaqueTimeoutError` on the deadline; the test itself is NOT stopped.
   */
  async waitForResult(
    runId: string,
    opts: SurveysWaitForResultOptions = {},
  ): Promise<SurveyResult> {
    const notFoundGrace = opts.notFoundGrace ?? DEFAULT_NOT_FOUND_GRACE;
    const started = Date.now();
    // Until a result is seen there is no `expiresAt` to derive a deadline from.
    let deadline = started + (opts.timeout ?? notFoundGrace);
    let deadlineDerived = opts.timeout !== undefined;
    let step = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let result: SurveyResult | undefined;
      try {
        result = await this.results.get(runId, opts.requestOptions);
      } catch (err) {
        if (!(err instanceof NotFoundError) || Date.now() - started >= notFoundGrace) throw err;
      }
      if (result) {
        if (opts.onUpdate) {
          try { opts.onUpdate(result); } catch { /* never break the wait */ }
        }
        if (TERMINAL_CAPTURE.has(result.capture?.status)) return result;
        if (!deadlineDerived) {
          deadline = result.expiresAt * 1000 + CAPTURE_GRACE;
          deadlineDerived = true;
        }
      }
      const now = Date.now();
      if (now >= deadline) {
        throw new NopaqueTimeoutError(
          `waitForResult timed out after ${now - started}ms waiting for survey result ${runId}`,
        );
      }
      const interval = Math.min(
        pollIntervalCurve(step, { base: opts.pollInterval, cap: opts.intervalCap }),
        Math.max(0, deadline - now),
      );
      await new Promise((r) => setTimeout(r, interval));
      step++;
    }
  }
}
