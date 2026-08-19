export interface TestStep {
  name?: string;
  action?: string;
  type?: 'dtmf' | 'audio' | 'listen';
  value?: string;
  expected?: string;
  threshold?: number;
  timeout?: number;
  delay?: number;
  dtmf?: string;
  audioUrl?: string;
  profileItemId?: string;
  [key: string]: unknown;
}

export interface TestConfig {
  id: string;
  name: string;
  phoneNumber: string;
  steps: TestStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTestConfigRequest {
  name: string;
  phoneNumber: string;
  steps: TestStep[];
}

export interface UpdateTestConfigRequest {
  name?: string;
  phoneNumber?: string;
  steps?: TestStep[];
}

export interface TestingListParams {
  limit?: number;
  nextToken?: string;
}

export type TestJobStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TestJob {
  id: string;
  configId: string;
  name?: string;
  status: TestJobStatus;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface CreateTestJobRequest {
  configId: string;
  name?: string;
}

export type TestRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * A single execution of a test. The primary identifier is `id`, matching the
 * server's entity shape. Pass it to `waitForRun()` and `get()`.
 *
 * `status` is optional because a newly-created run may not yet carry one
 * until the orchestrator picks it up.
 */
export interface TestRun {
  id: string;
  jobId?: string;
  testConfigId?: string;
  workspaceId?: string;
  status?: TestRunStatus;
  /**
   * Terminal verdict. The API never sends a `result` field — an SDK type
   * declaring one read as undefined on every run, including passing ones.
   */
  outcome?: TestRunOutcome | null;
  startedAt?: string;
  completedAt?: string;
  launchDeadline?: string;
  totalSteps?: number;
  passedSteps?: number;
  failedSteps?: number;
  [key: string]: unknown;
}

/**
 * A single scripted step's result. Named `TestStepResult`, not `StepResult` —
 * the latter is already exported for mapping and is an unrelated shape.
 */
export interface TestStepResult {
  id: string;
  runId: string;
  stepIndex: number;
  stepId: string;
  stepName: string;
  outcome: 'PASS' | 'FAIL' | 'TIMEOUT' | 'ERROR';
  expectedTranscript: string;
  actualTranscript?: string;
  similarity?: number;
  threshold: number;
  actionType?: string;
  actionValue?: string;
  duration?: number;
  errorMessage?: string;
  matcherScores?: Record<string, number>;
  turnTelemetry?: Record<string, unknown>;
  createdAt: string;
}

/**
 * What `testing.runs.get()` returns: the run row enriched with its step
 * results, the joined transcript, and a snapshot of the parent config.
 * Mission and compliance runs have no scripted steps, so `stepResults` is
 * empty and `config` is absent for those.
 */
export interface TestRunDetails extends TestRun {
  stepResults?: TestStepResult[];
  fullTranscript?: string;
  config?: TestConfig;
}

/**
 * Body for POST /testing/runs. Exactly one of jobId or testConfigId
 * must be provided:
 *   - jobId — run an existing scheduled test job
 *   - testConfigId — ad-hoc run directly from a test config
 */
export type CreateTestRunRequest =
  | { jobId: string; testConfigId?: never }
  | { jobId?: never; testConfigId: string };

export type TestRunType = 'mission' | 'compliance' | 'standard' | 'param';

export type TestRunOutcome = 'PASS' | 'FAIL' | 'ERROR' | 'INCONCLUSIVE' | 'pending';

/**
 * Slim summary returned by `testing.runs.list()` / `testing.listRuns()`.
 * No transcript/evidence — keeps the list payload light.
 */
export interface TestRunListItem {
  id: string;
  workspaceId: string;
  runType: TestRunType;
  configId?: string;
  catalogueTestId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  outcome?: TestRunOutcome | null;
  phoneNumber?: string;
  mission?: string;
  passedSteps?: number;
  failedSteps?: number;
  startedAt: string;
  completedAt?: string;
  /** Real call length in seconds (post-answer → last node), not orchestration wall-clock. */
  callDurationSecs?: number;
}

/** Query params for the filtered+paginated `GET /testing/runs`. */
export interface TestRunListParams {
  /** @deprecated Legacy back-compat filter. */
  jobId?: string;
  runType?: TestRunType;
  outcome?: TestRunOutcome;
  phoneNumber?: string;
  configId?: string;
  catalogueTestId?: string;
  /** ISO8601 datetime. */
  startedAfter?: string;
  /** ISO8601 datetime. */
  startedBefore?: string;
  sortBy?: 'startedAt' | 'completedAt';
  sortDir?: 'asc' | 'desc';
  /** Results per page (1..200, default 50). */
  limit?: number;
  /** Opaque pagination cursor. */
  cursor?: string;
  /** @deprecated Back-compat alias for `cursor`. */
  nextToken?: string;
}

export type AggregateGroupBy =
  | 'outcome'
  | 'runType'
  | 'configId'
  | 'catalogueTestId'
  | 'phoneNumber';

export type AggregateTimeBucket = 'day' | 'week' | 'month';

/** Query params for `GET /testing/runs/aggregate`. `groupBy` is required. */
export interface TestRunAggregateParams {
  runType?: TestRunType;
  outcome?: TestRunOutcome;
  phoneNumber?: string;
  configId?: string;
  catalogueTestId?: string;
  startedAfter?: string;
  startedBefore?: string;
  groupBy: AggregateGroupBy;
  timeBucket?: AggregateTimeBucket;
}

export interface AggregateGroup {
  key: string;
  count: number;
}

export interface TestRunAggregateResponse {
  groups?: AggregateGroup[];
  buckets?: Array<{ bucket: string; groups: AggregateGroup[] }>;
  truncated: boolean;
  totalGroups: number;
}

/**
 * Mission-strict response for `GET /testing/mission-test-runs/{id}`.
 * No stepResults — mission tests have no steps.
 */
export interface MissionTestRunResponse {
  id: string;
  workspaceId: string;
  configId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  outcome?: TestRunOutcome | null;
  sector?: string;
  mission?: string;
  acceptance?: string;
  passed?: boolean;
  passReasoning?: string;
  passEvidence?: unknown;
  verdict?: 'pass' | 'fail';
  complianceFailEvidence?: unknown[];
  compliancePassEvidence?: unknown[];
  judgeReasoning?: string;
  transcript?: unknown;
  phoneNumber?: string;
  audioId?: string;
  callControlId?: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * An operator-enabled Telnyx text-to-speech voice. Customers choose from this
 * curated set rather than the full Telnyx catalogue.
 */
export interface Voice {
  voiceId: string;
  name: string;
  language?: string;
  accent?: string;
  gender?: 'male' | 'female' | 'neutral';
  provider?: string;
  /** Descriptive blurb from the Telnyx catalogue. */
  label?: string;
  /**
   * Exactly one enabled voice carries this. It is the voice used when a mission
   * test does not choose one.
   */
  isDefault?: boolean;
}

/** Response for `GET /testing/voices`. */
export interface ListVoicesResponse {
  voices: Voice[];
  /**
   * Which voice is used when a mission test does not choose one. Absent only
   * if no voice is flagged default.
   */
  defaultVoiceId?: string;
}
