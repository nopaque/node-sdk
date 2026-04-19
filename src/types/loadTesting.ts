export type LoadTestStatus =
  | 'created'
  | 'queued'
  | 'running'
  | 'completed'
  | 'aborted'
  | 'failed';

export interface LoadTest {
  id: string;
  name: string;
  configId: string;
  concurrency: number;
  totalCalls: number;
  status: LoadTestStatus;
  runId?: string;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  abortedAt?: string;
}

export interface CreateLoadTestRequest {
  name: string;
  configId: string;
  concurrency: number;
  totalCalls: number;
}

export interface UpdateLoadTestRequest {
  name?: string;
  concurrency?: number;
  totalCalls?: number;
}

export interface LoadTestingListParams {
  limit?: number;
  nextToken?: string;
}

export interface LoadTestEstimateRequest {
  configId: string;
  concurrency: number;
  totalCalls: number;
}

export interface LoadTestEstimate {
  estimatedMinutes: number;
  estimatedCost: string;
  concurrency: number;
  totalCalls: number;
}

export interface LoadTestProgress {
  completedCalls: number;
  totalCalls: number;
  passRate?: number;
}

export interface LoadTestStatusResponse {
  id: string;
  status: LoadTestStatus;
  progress: LoadTestProgress;
  [key: string]: unknown;
}

export interface LoadTestRun {
  runId: string;
  loadTestId?: string;
  status: LoadTestStatus;
  passRate?: number;
  startedAt?: string;
  completedAt?: string;
  [key: string]: unknown;
}
