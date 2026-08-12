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
  headers?: Record<string, string>;
  model?: string;
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

export interface SendChatStep {
  type: 'send';
  text: string;
}

export interface ExpectChatStep {
  type: 'expect';
  expected: string;
}

export interface WaitChatStep {
  type: 'wait';
  seconds: number;
}

export interface EndChatStep {
  type: 'end';
}

/** One step of a `kind: standard` test, discriminated on `type`. */
export type ChatStep = SendChatStep | ExpectChatStep | WaitChatStep | EndChatStep;

/** Test data a `standard` run's steps draw on. The voice profile shape minus `voiceItems`. */
export interface DigitalProfile {
  id?: string;
  name?: string;
  items?: Record<string, string>;
}

/** Shaped like the voice `TestStepResult` so a client widens a union rather than learning a second shape. */
export interface DigitalStepResult {
  type?: string;
  expected?: string;
  actual?: string;
  passed?: boolean;
}

/** One conversation, with its own verdict and evidence. */
export interface DigitalSample {
  id?: string;
  outcome?: DigitalOutcome;
  transcript?: string;
  steps?: DigitalStepResult[];
  reason?: string;
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
  steps?: ChatStep[];
  samples?: number;
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

export type CreateDigitalTestRunRequest = DigitalTestConfigBase & {
  targetRef: string;
  target: DigitalTarget;
};

export type CreateDigitalTestConfigRequest = DigitalTestConfigBase & {
  name: string;
  targetRef: string;
  target: DigitalTarget;
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
  [key: string]: unknown;
}

export interface DigitalTestConfigListParams {
  limit?: number;
  cursor?: string;
  nextToken?: string | null;
  [key: string]: unknown;
}

export interface DigitalComplianceAuditSummary {
  targetRef: string;
  lastRunAt: string;
  runCount: number;
  catalogueTestIds: string[];
}
