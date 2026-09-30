/**
 * How the respondent behaves once the survey is under way. A closed set: each
 * value maps to wording nopaque maintains, so an unknown one is a 400.
 */
export type SurveyScenario =
  | 'happy-path'
  | 'out-of-range'
  | 'changes-mind'
  | 'abandons'
  | 'asks-question-back';

/** Observed when the survey arrives; absent until then. */
export type SurveyChannel = 'sms_chat' | 'phone_call';

export type SurveyRunState = 'waiting' | 'in_progress' | 'complete' | 'timed_out';

/**
 * What HAPPENED, not whether the survey passed. `completed` means every
 * expected question was asked and answered, and nothing more.
 */
export type SurveyOutcome =
  | 'completed'
  | 'partial'
  | 'ended'
  | 'no_survey_arrived'
  | 'stopped'
  | 'start_failed';

export type SurveyEndReason = 'survey_over' | 'window_lapsed' | 'stopped' | 'start_failed';

/**
 * `provisional` may still grow; `final` will not change; `failed` means the
 * conversation could not be retrieved, with `error` saying why.
 */
export type SurveyCaptureStatus = 'pending' | 'provisional' | 'final' | 'failed';

/**
 * Arguments to `surveys.start()`. `sender` is the number your survey platform
 * sends FROM; it goes on the wire as `endUserE164`.
 */
export interface StartSurveyTestParams {
  configId: string;
  /** E.164. Must not be a number inside this nopaque account - that is a 400. */
  sender: string;
  /** 60-43200. Server default 300. The window holds one of your numbers, so keep it short. */
  windowSecs?: number;
  /**
   * 1-50. Overrides the config's question count for this test. The only limit
   * that is actually enforced.
   */
  expectedTurns?: number;
  /** 1-200. Server default 40. A loop-safety cap in the respondent's instructions, not enforced. */
  maxMessages?: number;
}

/** Body for `POST /testing/survey-runs`, as sent. */
export interface StartSurveyTestRequest {
  configId: string;
  endUserE164: string;
  windowSecs?: number;
  expectedTurns?: number;
  maxMessages?: number;
}

export interface StartSurveyTestResponse {
  runId: string;
  configId: string;
  /** Point the survey at this number. Nothing can reach the test until it is aimed here. */
  agentE164: string;
  endUserE164: string;
  state: 'waiting';
  startedAt: string;
  /** Epoch SECONDS. */
  expiresAt: number;
  maxMessages: number;
}

/** A survey test while it holds a number. */
export interface SurveyRun {
  runId: string;
  configId: string;
  agentE164: string;
  endUserE164: string;
  state: SurveyRunState;
  startedAt: string;
  engagedAt?: string;
  channel?: SurveyChannel;
  /** Epoch SECONDS. Expiry sweeps are lazy - judge liveness by `live`. */
  expiresAt: number;
  live: boolean;
  expectedTurns?: number;
  answersGiven?: number;
  /** `false` means no question count is set, so the respondent answers until stopped. */
  enforcementActive?: boolean;
}

/** Concurrency, made visible. Check `free` before starting another test. */
export interface SurveyNumbers {
  total: number;
  busy: number;
  free: number;
}

export interface ListSurveyRunsResponse {
  runs: SurveyRun[];
  numbers: SurveyNumbers;
}

export interface SurveyCapture {
  status: SurveyCaptureStatus;
  capturedAt?: string;
  error?: string;
}

/** What happened in one survey test, kept after the test has ended however it ended. */
export interface SurveyResultSummary {
  runId: string;
  configId: string;
  /** The respondent's name when the test started. */
  configName?: string;
  scenario?: SurveyScenario;
  profileName?: string;
  agentE164: string;
  endUserE164: string;
  channel?: SurveyChannel;
  startedAt: string;
  /** Epoch SECONDS - the close of the test window. */
  expiresAt: number;
  expectedTurns?: number;
  answersGiven: number;
  engagedAt?: string;
  endedAt?: string;
  state: 'live' | 'ended';
  /** Set when the test ends. */
  outcome?: SurveyOutcome;
  endReason?: SurveyEndReason;
  /** More than 500 messages were exchanged; only the first 500 are kept. */
  turnsTruncated: boolean;
  capture: SurveyCapture;
}

/** One message. `survey` is your platform; `respondent` is nopaque answering it. */
export interface SurveyTurn {
  at: string;
  from: 'survey' | 'respondent';
  text: string;
}

export interface SurveyResult extends SurveyResultSummary {
  /**
   * Oldest first. An empty list never means "could not be retrieved" - that is
   * `capture.status === 'failed'`.
   */
  turns: SurveyTurn[];
}

export interface SurveyResultListParams {
  /** 1-100. Server default 50. */
  limit?: number;
  cursor?: string;
  nextToken?: string | null;
}

/**
 * One page of results, newest first. `nextCursor` is OMITTED (not null) on
 * the last page.
 */
export interface ListSurveyResultsResponse {
  results: SurveyResultSummary[];
  nextCursor?: string;
}

/** A saved survey respondent. Carries no phone number - the customer's platform originates. */
export interface SurveyTestConfig {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  sector: string;
  mission: string;
  acceptance: string;
  profileId?: string;
  expectedTurns?: number;
  scenario: SurveyScenario;
  tags?: string[];
  /** Voice surveys only; ignored on an SMS conversation. */
  voiceId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Slim list projection: `mission` and `acceptance` are omitted. */
export type SurveyTestConfigListItem = Omit<SurveyTestConfig, 'mission' | 'acceptance'>;

export interface ListSurveyTestConfigsResponse {
  configs: SurveyTestConfigListItem[];
}

/** `required: [name, sector, mission, acceptance, scenario]`. Unknown properties are a 400. */
export interface CreateSurveyTestConfigRequest {
  name: string;
  description?: string;
  sector: string;
  mission: string;
  acceptance: string;
  profileId?: string;
  /** 1-50. Without it nothing is enforced. */
  expectedTurns?: number;
  scenario: SurveyScenario;
  tags?: string[];
  voiceId?: string;
}

/**
 * Partial update. At least one field is required - an empty body is a 400.
 * `null` clears `description`, `tags` or `voiceId`.
 */
export interface UpdateSurveyTestConfigRequest {
  name?: string;
  description?: string | null;
  sector?: string;
  mission?: string;
  acceptance?: string;
  profileId?: string;
  expectedTurns?: number;
  scenario?: SurveyScenario;
  tags?: string[] | null;
  voiceId?: string | null;
}
