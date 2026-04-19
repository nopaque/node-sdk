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

export type SweepRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface SweepVariationResult {
  variation: Record<string, string>;
  result: 'pass' | 'fail' | 'partial';
}

export interface SweepRun {
  runId: string;
  sweepId?: string;
  status: SweepRunStatus;
  variations?: number;
  passRate?: number;
  results?: SweepVariationResult[];
  startedAt?: string;
  completedAt?: string;
  [key: string]: unknown;
}
