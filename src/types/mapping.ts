import type { CallTelemetry, TurnTelemetry } from './telemetry.js';

export type JobStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'limited'
  | 'cancelled'
  | 'created';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'skipped';

export type MappingMode = 'dtmf' | 'dtmf-audio' | 'full-audio';

/**
 * Latest-run status used by the list filter and the `MappingJobListItem.status`
 * field (post-merged from the run, not the job-level idle/running cycle).
 */
export type MappingRunStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'limited';

export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
}

export interface MappingJobConfig {
  maxDepth?: number;
  maxCalls?: number;
  maxDurationMinutes?: number;
  maxConcurrency?: number;
  language?: string;
  voiceProfileId?: string;
  dataProfileId?: string;
  retryConfig?: RetryConfig;
  mappingMode?: MappingMode;
}

export interface MappingJobStats {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  loopsDetected: number;
  retriedCalls: number;
}

/**
 * Nested run summary surfaced on the single-job response (`GET /mapping/{id}`).
 * Present when a run exists; omitted (never null) when the job has no runs yet.
 * Unlike the job-level status, `status` here CAN reach `completed`.
 */
export interface CurrentRun {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'limited';
  runNumber: number;
  stats?: MappingJobStats;
  inFlightCount?: number;
  limitReason?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MappingJob {
  id: string;
  workspaceId?: string;
  userId?: string;
  name: string;
  phoneNumber?: string;
  profileId?: string;
  status: JobStatus;
  config?: MappingJobConfig;
  stats?: MappingJobStats;
  inFlightCount?: number;
  pendingPaths?: string[];
  currentRunId?: string;
  runId?: string;
  runNumber?: number;
  /** Nested run summary — present when a run exists; omitted (never null) otherwise. */
  currentRun?: CurrentRun;
  limitReason?: string;
  error?: string;
  /** User-defined labels (max 10, lowercase kebab-case). */
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

/**
 * Slim projection returned by `mapping.list()`. `status` is the latest-run
 * status (post-merged), not the job-level idle/running cycle.
 */
export interface MappingJobListItem {
  id: string;
  workspaceId?: string;
  userId?: string;
  name: string;
  phoneNumber?: string;
  status: MappingRunStatus | JobStatus;
  config?: MappingJobConfig;
  tags?: string[];
  error?: string;
  runNumber?: number;
  profileId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMappingJobRequest {
  name: string;
  phoneNumber: string;
  profileId?: string;
  config?: MappingJobConfig;
  /** User-defined labels (max 10, lowercase kebab-case). */
  tags?: string[];
}

export interface UpdateMappingJobRequest {
  name?: string;
  phoneNumber?: string;
  config?: MappingJobConfig;
  /** User-defined labels (max 10, lowercase kebab-case). */
  tags?: string[];
}

export interface MappingListParams {
  /** E.164 exact match. */
  phoneNumber?: string;
  /** Case-insensitive substring match on job name. */
  name?: string;
  /** Exact UUID match on the data profile. */
  profileId?: string;
  /** Single lowercase tag exact match. */
  tag?: string;
  /** Filter by latest-run status. */
  status?: MappingRunStatus;
  /** ISO8601 datetime — jobs created at or after this time. */
  createdAfter?: string;
  /** ISO8601 datetime — jobs created at or before this time. */
  createdBefore?: string;
  /** Sort field (only 'createdAt' supported). */
  sort?: 'createdAt';
  /** Sort direction (default 'desc'). */
  sortDir?: 'asc' | 'desc';
  /** Results per page (1..100, default 50). */
  limit?: number;
  /** Opaque pagination cursor from a previous response's nextCursor. */
  cursor?: string;
  /** @deprecated Back-compat alias for `cursor`. */
  nextToken?: string;
  /** @deprecated No longer read by the API; workspace is derived from the key. */
  workspaceId?: string;
}

export interface DTMFOption {
  digit: string;
  label?: string;
}

export interface StepResult {
  transcript: string;
  dtmfOptions: DTMFOption[];
  isTerminal: boolean;
  audioUrl?: string;
  audioSizeBytes?: number;
  duration?: number;
  /** Per-step telemetry (additive, all-optional). */
  turnTelemetry?: TurnTelemetry;
}

export interface MappingStep {
  id: string;
  jobId: string;
  runId: string;
  workspaceId?: string;
  parentStepId?: string;
  depth: number;
  path: string[];
  pathString: string;
  status: StepStatus;
  retryCount: number;
  result?: StepResult;
  transcriptHash?: string;
  createdAt?: string;
  completedAt?: string;
}

/** Per-step UX hint for prompts that require user input (e.g. PIN/account number). */
export interface TreeInputRequired {
  type: string;
  description: string;
  formatHint?: string;
  terminator?: string;
  startTimeMs?: number;
}

/** Enrichment fields shared by TreeNode and FlatTreeNode (all optional/additive). */
export interface TreeNodeEnrichment {
  stepType?: 'dtmf' | 'voice';
  voicePrompt?: string;
  menuLabel?: string;
  spokenResponse?: string;
  probeCategory?: string;
  probeClassification?: string;
  probeRationale?: string;
  audioUrl?: string;
  duration?: number;
  inputRequired?: TreeInputRequired;
}

export interface TreeNode extends TreeNodeEnrichment {
  stepId: string;
  digit?: string;
  label?: string;
  depth: number;
  path: string[];
  status: StepStatus;
  transcript?: string;
  isTerminal: boolean;
  children: TreeNode[];
}

export interface FlatTreeNode extends TreeNodeEnrichment {
  stepId: string;
  digit?: string;
  label?: string;
  depth: number;
  path: string[];
  status: StepStatus;
  transcript?: string;
  isTerminal: boolean;
}

/**
 * Empty-state envelope (200 OK) returned by the tree endpoint when there is no
 * tree to render. Branch on `tree === null` to detect it.
 */
export interface MappingTreeEmptyState {
  jobId: string;
  runId?: string;
  runNumber?: number;
  status: string;
  stats?: MappingJobStats;
  tree: null;
  reason: 'no_runs' | 'no_steps' | 'in_progress';
  message: string;
}

/**
 * Tree response. In the happy path `tree` (or `steps` for flat format) is
 * populated; in the empty state `tree` is `null` and `reason`/`message` explain
 * why. `root` is retained for back-compat with older shapes.
 */
export interface MappingTree {
  jobId?: string;
  runId?: string;
  runNumber?: number;
  status?: string;
  stats?: MappingJobStats;
  tree?: TreeNode | null;
  root?: TreeNode | null;
  /** Present when format='flat'. */
  steps?: FlatTreeNode[];
  reason?: 'no_runs' | 'no_steps' | 'in_progress';
  message?: string;
}

export interface MappingPath {
  jobId?: string;
  path: string;
  status: string;
  transcript?: string;
  isTerminal?: boolean;
  repeatBehavior?: string;
}

export interface MappingRun {
  id: string;
  jobId?: string;
  status: string;
  runNumber?: number;
  startedAt?: string;
  completedAt?: string;
  stats?: MappingJobStats;
  /** Call-level telemetry (additive, all-optional). */
  callTelemetry?: CallTelemetry;
}

export type TreeFormat = 'tree' | 'flat';

export interface ProbeResult {
  message: string;
  probeCount: number;
}
