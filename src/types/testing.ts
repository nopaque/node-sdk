import type { TranscriptionLanguage } from './language.js';
import type { CallTelemetry } from './telemetry.js';

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

export type TestConfigType = 'standard' | 'parameterized';

export interface TestConfig {
  id: string;
  name: string;
  phoneNumber: string;
  steps: TestStep[];
  /**
   * Bring-your-own-carrier (invite-only). Dial this config's calls through one
   * of the workspace's carrier routes, over the workspace's own SIP trunk,
   * instead of nopaque's network. Omitted when the config dials normally.
   * A config with a route dials through it or not at all: if the route cannot
   * be dialled when a run starts, the run is refused and the number is never
   * called normally.
   */
  carrierRouteId?: string;
  /** Free-text description shown with the config. */
  description?: string;
  /** `parameterized` configs take per-run parameters (see `requiredParameters`). Defaults to `standard`. */
  type?: TestConfigType;
  /** Profile whose data and voice items steps can reference. */
  profileId?: string;
  /** Parameter names a run of a `parameterized` config must supply. */
  requiredParameters?: string[];
  /** Schedule this config runs on, when it has one. */
  scheduleId?: string;
  /** Whole-call ceiling in seconds (30–1800). The tester's default of 300 applies when unset. */
  maxDurationSecs?: number;
  /**
   * Transcription language for this config's calls. Absent means the API's
   * default, `en-GB`.
   */
  language?: TranscriptionLanguage;
  workspaceId?: string;
  version?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTestConfigRequest {
  name: string;
  phoneNumber: string;
  steps: TestStep[];
  /**
   * Bring-your-own-carrier (invite-only). Dial this config's calls through one
   * of the workspace's carrier routes, over the workspace's own SIP trunk,
   * instead of nopaque's network. Use a route's `routeId` from
   * `testing.carrierIntegrations`. A config with a route dials through it or
   * not at all: if the route cannot be dialled when a run starts, the run is
   * refused and the number is never called normally. The route is checked on
   * save: 400 if it cannot be dialled, 503 if it could not be looked up.
   */
  carrierRouteId?: string;
  /** Free-text description shown with the config. */
  description?: string;
  /** `parameterized` configs take per-run parameters (see `requiredParameters`). Defaults to `standard`. */
  type?: TestConfigType;
  /** Profile whose data and voice items steps can reference. */
  profileId?: string;
  /** Parameter names a run of a `parameterized` config must supply. */
  requiredParameters?: string[];
  /** Run this config on a schedule. */
  scheduleId?: string;
  /**
   * Whole-call ceiling in seconds (30–1800). When omitted the tester applies
   * its default of 300. Every `hold` step's `durationSecs` must fit inside it.
   */
  maxDurationSecs?: number;
  /**
   * Transcription language for this config's calls. Omit it to take the API's
   * default of `en-GB` — the SDK sends the key only when you pass it, so the
   * default stays the API's to apply.
   *
   * A transcription language, not the mission-test call language: bare `'en'`
   * is rejected with a 400 here. See `TranscriptionLanguage`.
   */
  language?: TranscriptionLanguage;
}

export interface UpdateTestConfigRequest {
  name?: string;
  phoneNumber?: string;
  steps?: TestStep[];
  /**
   * Bring-your-own-carrier (invite-only): dial this config's calls through one
   * of the workspace's carrier routes, over the workspace's own SIP trunk.
   * Pass a `routeId`, `null` or `''` to remove the route (the number is then
   * dialled normally and must pass the dial policy on its own), or omit to
   * leave it unchanged.
   */
  carrierRouteId?: string | null;
  /** Free-text description shown with the config. */
  description?: string;
  /** `parameterized` configs take per-run parameters (see `requiredParameters`). Defaults to `standard`. */
  type?: TestConfigType;
  /** Profile whose data and voice items steps can reference. */
  profileId?: string;
  /** Parameter names a run of a `parameterized` config must supply. */
  requiredParameters?: string[];
  /** A schedule id, `null` to unlink the schedule, or omit to leave it unchanged. */
  scheduleId?: string | null;
  /** Seconds (30–1800), `null` to go back to the default of 300, or omit to leave it unchanged. */
  maxDurationSecs?: number | null;
  /**
   * Transcription language for this config's calls. **Omit the key to leave the
   * saved value untouched** — updating other fields never resets the language,
   * and there is no implicit reversion to `en-GB`. Pass a code to change it.
   *
   * A transcription language, not the mission-test call language: bare `'en'`
   * is rejected with a 400 here. See `TranscriptionLanguage`.
   */
  language?: TranscriptionLanguage;
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
  /**
   * Call-level telemetry. The hang-up cause is in `callTelemetry.telephony`:
   * `hangupCause`, `hangupSource` and `sipHangupCause`.
   */
  callTelemetry?: CallTelemetry;
  /**
   * Bring-your-own-carrier (invite-only): the carrier route this run was
   * dialled through, recorded at dispatch. It still names that route after
   * the config's `carrierRouteId` changes. Absent when dialled normally.
   */
  carrier?: TestRunCarrier;
  [key: string]: unknown;
}

/** The carrier route a bring-your-own-carrier run was dialled through. */
export interface TestRunCarrier {
  integrationId: string;
  routeId: string;
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

// ---------------------------------------------------------------------------
// Bring your own carrier (invite-only)
// ---------------------------------------------------------------------------

/** An `X-` SIP header sent on the INVITE, for SBCs that route on a header. */
export interface CarrierCustomHeader {
  /** Matches `^X-[A-Za-z0-9-]{1,64}$`. */
  name: string;
  /** 1..256 characters, no line breaks. */
  value: string;
}

/**
 * One vendor reached through a carrier integration, selected by its tech
 * prefix. Put its `routeId` on a test config as `carrierRouteId` to dial
 * through it.
 */
export interface CarrierRoute {
  routeId: string;
  integrationId: string;
  name: string;
  /**
   * Dialled in front of the destination number
   * (`sip:{techPrefix}{e164}@{host}:{port}`). Empty means the trunk's default
   * route. Matches `^[0-9A-Za-z#*]{0,16}$`.
   */
  techPrefix: string;
  customHeaders: CarrierCustomHeader[];
  enabled: boolean;
  /**
   * Whether a run naming this route would be placed now: the route is enabled
   * and its integration is `active`. Checked again when a run starts.
   */
  dialable: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CarrierIntegrationStatus = 'draft' | 'verified' | 'active' | 'disabled';

/**
 * One of the workspace's own SIP trunks. Set up and managed by nopaque with
 * you; read-only through the API. Credentials are never returned:
 * `hasCredentials` says whether the trunk uses digest authentication.
 */
export interface CarrierIntegration {
  integrationId: string;
  name: string;
  /** The SBC's hostname or IPv4 address. */
  host: string;
  port: number;
  transport: 'UDP' | 'TCP' | 'TLS';
  mediaEncryption: 'disabled' | 'SRTP';
  /** Caller ID sent on the INVITE, when set. */
  fromNumber?: string;
  status: CarrierIntegrationStatus;
  verifiedAt?: string;
  hasCredentials: boolean;
  /** Calls in flight on this trunk at once (1..20). */
  maxConcurrentCalls: number;
  /** Connected minutes per UTC day across this trunk (1..10000). */
  dailyMinutes: number;
  createdAt: string;
  updatedAt: string;
  /** Sorted by name. Includes routes that cannot be dialled; see `dialable`. */
  routes: CarrierRoute[];
}

/** Body for `POST /testing/carrier-integrations/{integrationId}/routes`. */
export interface CreateCarrierRouteRequest {
  /** 1..100 characters. */
  name: string;
  /** Defaults to `''` (the trunk's default route). */
  techPrefix?: string;
  /** Up to 10. Defaults to `[]`. */
  customHeaders?: CarrierCustomHeader[];
  /** Defaults to `true`. */
  enabled?: boolean;
}

/**
 * Body for `PATCH /testing/carrier-integrations/{integrationId}/routes/{routeId}`.
 * Send only what changes; at least one field. `enabled: false` turns the route
 * off: runs that name it are refused, never dialled another way.
 */
export interface UpdateCarrierRouteRequest {
  name?: string;
  techPrefix?: string;
  customHeaders?: CarrierCustomHeader[];
  enabled?: boolean;
}
