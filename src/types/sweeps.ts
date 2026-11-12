export type SweepStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Sweep {
  id: string;
  name: string;
  configId: string;
  parameters?: Record<string, string[]>;
  status: SweepStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSweepRequest {
  name: string;
  configId: string;
  parameters: Record<string, string[]>;
}

export interface UpdateSweepRequest {
  name?: string;
  parameters?: Record<string, string[]>;
}

export interface SweepsListParams {
  limit?: number;
  nextToken?: string;
}

/** `partial`: some test runs passed and some did not. */
export type SweepRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial' | 'cancelled';

export interface SweepVariationResult {
  variation: Record<string, string>;
  result: 'pass' | 'fail' | 'partial';
}

/** Test-run counts for a sweep run, recomputed on every read. */
export interface SweepRunSummary {
  total: number;
  pending: number;
  running: number;
  passed: number;
  failed: number;
  error: number;
}

/** One test run in a sweep run (one per profile). */
export interface SweepRunTestRun {
  id: string;
  testConfigId: string;
  profileId?: string;
  status: string;
  /** Set once the run has finished. */
  outcome?: 'PASS' | 'FAIL' | 'ERROR';
  startedAt?: string;
  completedAt?: string;
}

/**
 * A sweep run. `summary` and `testRunIds` are on every sweep run; `testRuns`
 * only on `getRun()`.
 */
export interface SweepRun {
  id: string;
  sweepId?: string;
  workspaceId?: string;
  status: SweepRunStatus;
  summary: SweepRunSummary;
  testRunIds?: string[];
  testRuns?: SweepRunTestRun[];
  triggeredBy?: 'manual' | 'schedule';
  scheduleId?: string;
  createdBy?: string;
  startedAt?: string;
  completedAt?: string;
  /** @deprecated Never sent by the API; always undefined. Use `summary.total`. */
  variations?: number;
  /** @deprecated Never sent by the API; always undefined. */
  passRate?: number;
  /** @deprecated Never sent by the API; always undefined. Use `testRuns`. */
  results?: SweepVariationResult[];
  /** @deprecated use `id` */
  runId?: string;
  [key: string]: unknown;
}
