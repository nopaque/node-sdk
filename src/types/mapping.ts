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
  limitReason?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface CreateMappingJobRequest {
  name: string;
  phoneNumber: string;
  profileId?: string;
  config?: MappingJobConfig;
}

export interface UpdateMappingJobRequest {
  name?: string;
  phoneNumber?: string;
  config?: MappingJobConfig;
}

export interface MappingListParams {
  workspaceId?: string;
  limit?: number;
  nextToken?: string;
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

export interface TreeNode {
  stepId: string;
  digit?: string;
  label?: string;
  depth: number;
  path: string[];
  status: StepStatus;
  transcript?: string;
  isTerminal: boolean;
  children: TreeNode[];
  duration?: number;
  audioUrl?: string;
}

export interface MappingTree {
  jobId?: string;
  runId?: string;
  status?: string;
  stats?: MappingJobStats;
  tree?: TreeNode | null;
  root?: TreeNode | null;
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
  startedAt?: string;
  completedAt?: string;
  stats?: MappingJobStats;
}

export type TreeFormat = 'tree' | 'flat';
