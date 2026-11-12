export type BatchStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Batch {
  id: string;
  name: string;
  configId: string;
  datasetId: string;
  status: BatchStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBatchRequest {
  name: string;
  configId: string;
  datasetId: string;
}

export interface UpdateBatchRequest {
  name?: string;
  datasetId?: string;
  configId?: string;
}

export interface BatchesListParams {
  limit?: number;
  nextToken?: string;
}

export type BatchRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'partial'
  | 'cancelled';

export interface BatchRun {
  id: string;
  batchId?: string;
  status: BatchRunStatus;
  totalNumbers?: number;
  passed?: number;
  failed?: number;
  passRate?: number;
  startedAt?: string;
  completedAt?: string;
  /** @deprecated use `id` */
  runId?: string;
  [key: string]: unknown;
}

/**
 * Optional selector for `batches.rerun()`. Omit it to re-run every failed test.
 * `members` takes precedence over `testConfigIds`, which takes precedence over
 * `filter`. Ids that did not fail in the parent run are silently dropped.
 */
export interface RerunBatchRunRequest {
  filter?: 'all-failed' | 'errors' | 'mismatches';
  /** Legacy: explicit param configs to re-run. */
  testConfigIds?: string[];
  members?: Array<{ type: 'param' | 'mission'; configId: string }>;
}
