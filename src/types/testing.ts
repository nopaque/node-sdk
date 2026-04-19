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

export interface TestConfig {
  id: string;
  name: string;
  phoneNumber: string;
  steps: TestStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTestConfigRequest {
  name: string;
  phoneNumber: string;
  steps: TestStep[];
}

export interface UpdateTestConfigRequest {
  name?: string;
  phoneNumber?: string;
  steps?: TestStep[];
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
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TestRunResult = 'pass' | 'fail' | 'partial';

export interface TestRun {
  runId: string;
  jobId: string;
  status: TestRunStatus;
  result?: TestRunResult;
  startedAt?: string;
  completedAt?: string;
  [key: string]: unknown;
}

export interface CreateTestRunRequest {
  jobId: string;
}
