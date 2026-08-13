/** Amazon Connect chat via StartChatContact plus the participant websocket. */
export interface ConnectChatTarget {
  transport: 'connect-chat';
  instanceId: string;
  contactFlowId: string;
  region?: string;
  attributes?: Record<string, string>;
  assumeRoleArn?: string;
}

/** Generic REST chat endpoint, including OpenAI-compatible shapes. */
export interface HttpJsonTarget {
  transport: 'http-json';
  endpoint: string;
  openaiCompatible?: boolean;
  authRef?: string;
}

/** Browser-automated embedded chat widget, for targets with no API at all. */
export interface WebWidgetTarget {
  transport: 'web-widget';
  url: string;
  selectorProfile?: string;
}

/**
 * What `phoneNumber` becomes on a text channel. Discriminated on `transport`.
 * `targetRef` (on the run, not here) is the stable human-readable identity a
 * report aggregates on.
 */
export type DigitalTarget = ConnectChatTarget | HttpJsonTarget | WebWidgetTarget;

/** Fields every chat step carries. */
export interface ChatStepBase {
  id?: string;
  name?: string;
}

/**
 * Send a customer message. Supply EXACTLY ONE of `text` or `profileItemId` -
 * both, or neither, is a 400.
 *
 * `profileItemId` is a key into `profile.dataItems`, mirroring how a voice DTMF
 * step resolves one. There is no template syntax: an unresolvable reference
 * fails loudly rather than sending the literal `{{accountNumber}}` to the bot.
 */
export type SendChatStep = ChatStepBase & { type: 'send' } & (
    | { text: string; profileItemId?: never }
    | { profileItemId: string; text?: never }
  );

/** How an `expect` step compares the bot's message. `exact` is the default. */
export type ChatMatcher = 'exact' | 'contains' | 'regex' | 'similarity';

/**
 * Assert the bot's next message.
 *
 * `exact` is the default because chat delivers the bytes the bot sent. Matching
 * trims and collapses whitespace but is case-SENSITIVE.
 */
export interface ExpectChatStep extends ChatStepBase {
  type: 'expect';
  expected: string;
  /** Defaults to `exact`. */
  matcher?: ChatMatcher;
  /**
   * 0-100. Only consulted by `similarity`, but reported on every result row so
   * a failure shows the bar it was judged against. Defaults to 100.
   */
  threshold?: number;
  /** Greater than 0, at most 120. Defaults to 20. */
  timeoutSecs?: number;
}

/** Pause. For targets that rate-limit, or to let an async handoff settle. */
export interface WaitChatStep extends ChatStepBase {
  type: 'wait';
  /** Greater than 0, at most 60. Defaults to 1. */
  seconds?: number;
}

/** Close the conversation explicitly. Optional - the runner closes the transport anyway. */
export interface EndChatStep extends ChatStepBase {
  type: 'end';
}

/** One step of a `kind: standard` test, discriminated on `type`. */
export type ChatStep = SendChatStep | ExpectChatStep | WaitChatStep | EndChatStep;

/** One named piece of test data a `standard` run's steps draw on. */
export interface DigitalProfileItem {
  label?: string;
  value?: string;
}

/** Test data a `standard` run's steps draw on. The voice profile shape minus `voiceItems`. */
export interface DigitalProfile {
  dataItems?: Record<string, DigitalProfileItem>;
}

/** Shaped like the voice `TestStepResult` so a client widens a union rather than learning a second shape. */
export interface DigitalStepResult {
  stepId?: string;
  name?: string;
  actionType?: string;
  actionValue?: string;
  expectedTranscript?: string;
  actualTranscript?: string;
  /** Reported whatever the matcher - on a failure it distinguishes a typo from a wrong turn. */
  similarity?: number;
  threshold?: number;
  outcome?: string;
  duration?: number;
}

/** One turn of the conversation, as the worker's transcript emits it. */
export interface DigitalTranscriptTurn {
  role?: string;
  text?: string;
  at?: string;
}

/**
 * One condition the judge cited for its verdict. `condition` and `reason` are
 * what the judge sends today; the rest are tolerated because the judge may add
 * fields and an unknown one must never cost a caller their verdict.
 */
export interface DigitalEvidence {
  condition?: string;
  reason?: string;
  quote?: string;
  met?: boolean;
  triggered?: boolean;
  turn?: number;
}

/** One conversation, with its own verdict and evidence. */
export interface DigitalSample {
  outcome?: DigitalOutcome;
  stepResults?: DigitalStepResult[];
  stepsRun?: number;
  stepsTotal?: number;
  /** A list of turns, NOT a string - whatever the OpenAPI document says. */
  transcript?: DigitalTranscriptTurn[];
  reasoning?: string;
  /** Judged kinds only. There is no combined `evidence` field. */
  passEvidence?: DigitalEvidence[];
  failEvidence?: DigitalEvidence[];
  failureReason?: string;
}

export type DigitalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type DigitalOutcome = 'pass' | 'fail' | 'inconclusive';
export type DigitalTestKind = 'freeform' | 'compliance' | 'standard';

export interface DigitalTestRun {
  id: string;
  workspaceId: string;
  userId?: string;
  targetRef: string;
  channel: 'chat';
  target?: DigitalTarget;
  kind: DigitalTestKind;
  sector?: string;
  mission?: string;
  acceptance?: string;
  catalogueTestId?: string;
  /** Set when the run was launched from a saved config. Undeclared in the OpenAPI document. */
  configId?: string;
  /**
   * `failed` means the test could not be DELIVERED (an infrastructure failure,
   * with `failureReason` set). A bot that behaved badly produces `completed`
   * with `outcome: 'fail'` - the two are deliberately not the same thing.
   */
  status: DigitalRunStatus;
  outcome?: DigitalOutcome;
  samplesRequested?: number;
  samplesJudged?: number;
  passed?: number;
  failed?: number;
  /**
   * Samples that never produced a verdict because the transport failed. Kept
   * SEPARATE from `passRate`.
   */
  transportErrors?: number;
  /** passed / samplesJudged. Null until the run reaches a verdict. */
  passRate?: number | null;
  sampleOutcomes?: string[];
  samples?: DigitalSample[];
  payloadS3Bucket?: string;
  payloadS3Key?: string;
  payloadBytes?: number;
  failureReason?: string;
  startedAt: string;
  completedAt?: string;
  /** Still `pending` past this means no worker ever picked the job up. */
  launchDeadline?: string;
}

export interface DigitalTestConfigBase {
  name?: string;
  description?: string;
  targetRef?: string;
  target?: DigitalTarget;
  sector?: string;
  mission?: string;
  kind?: DigitalTestKind;
  /** Required for `kind: 'freeform'`. */
  acceptance?: string;
  /** Required for `kind: 'compliance'`. Matches `^M-\d{3}$`. */
  catalogueTestId?: string;
  passConditions?: string[];
  failConditions?: string[];
  setup?: string;
  additionalContext?: string;
  profileId?: string;
  /** Inline test data. `profileId` takes precedence over this. */
  profile?: DigitalProfile;
  /** Flat label to value dict for the judged kinds. */
  profileSnapshot?: Record<string, unknown>;
  /** Probe utterances for the judged kinds. `standard` uses `steps` instead. */
  probes?: string[];
  /** `standard` only. A judged kind carrying steps is rejected. */
  steps?: ChatStep[];
  /** 1-10. Defaults to 3 for the judged kinds and 1 for `standard`. */
  samples?: number;
  /** 1-60. Defaults to 12. */
  maxTurns?: number;
}

export interface DigitalTestConfig extends DigitalTestConfigBase {
  id: string;
  workspaceId: string;
  name: string;
  targetRef: string;
  target: DigitalTarget;
  sector: string;
  mission: string;
  kind: DigitalTestKind;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

/** `required: [targetRef, target, sector, mission]`. */
export type CreateDigitalTestRunRequest = DigitalTestConfigBase & {
  targetRef: string;
  target: DigitalTarget;
  sector: string;
  mission: string;
};

/** `required: [name, targetRef, target, sector, mission]`. */
export type CreateDigitalTestConfigRequest = DigitalTestConfigBase & {
  name: string;
  targetRef: string;
  target: DigitalTarget;
  sector: string;
  mission: string;
};

export type UpdateDigitalTestConfigRequest = DigitalTestConfigBase;

/**
 * Optional overrides. Everything not supplied comes from the saved config.
 * `target` and `targetRef` must be overridden TOGETHER - a half-override is a 400.
 */
export interface LaunchDigitalTestConfigRequest {
  targetRef?: string;
  target?: DigitalTarget;
  samples?: number;
}

export interface DigitalTestRunListParams {
  targetRef?: string;
  limit?: number;
  cursor?: string;
  nextToken?: string | null;
}

export interface DigitalTestConfigListParams {
  limit?: number;
  cursor?: string;
  nextToken?: string | null;
}

export interface DigitalComplianceAuditSummary {
  targetRef: string;
  lastRunAt: string;
  runCount: number;
  catalogueTestIds: string[];
}

/** Optional filters for `GET /digital-testing/compliance-audits/report`. */
export interface DigitalComplianceReportParams {
  /** Restrict the catalogue to tests applicable to this sector. */
  sector?: string;
}

export interface CreateDigitalTestRunResponse {
  message: string;
  run: DigitalTestRun;
}

/**
 * One page of runs, newest first. `nextCursor` is present ONLY when another
 * page exists, and is OMITTED (not null) on the last page.
 */
export interface ListDigitalTestRunsResponse {
  runs: DigitalTestRun[];
  nextCursor?: string;
}

/** One page of saved configs, most recently updated first. */
export interface ListDigitalTestConfigsResponse {
  configs: DigitalTestConfig[];
  nextCursor?: string;
}

export interface ListDigitalComplianceAuditsResponse {
  audits: DigitalComplianceAuditSummary[];
}
