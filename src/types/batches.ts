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

export type BatchRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

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
