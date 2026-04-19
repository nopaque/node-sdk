export type ScheduleStatus = 'active' | 'paused' | 'disabled';

export interface Schedule {
  id: string;
  name: string;
  configId: string;
  cronExpression: string;
  timezone?: string;
  status: ScheduleStatus;
  nextRunAt?: string;
  createdAt?: string;
  updatedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
}

export interface CreateScheduleRequest {
  name: string;
  configId: string;
  cronExpression: string;
  timezone?: string;
}

export interface UpdateScheduleRequest {
  name?: string;
  cronExpression?: string;
  timezone?: string;
}

export interface ScheduleListParams {
  limit?: number;
  nextToken?: string;
}
