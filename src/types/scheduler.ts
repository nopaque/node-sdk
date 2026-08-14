/**
 * Which firing strategy a schedule uses. Required on create — the API rejects
 * a schedule without one, and each variant requires a different companion
 * field: `cron` needs `cronExpression`, `recurring` needs `intervalMinutes`,
 * `once` needs a future `runAt`.
 */
export type ScheduleType = 'once' | 'recurring' | 'cron';

/** What the schedule fires against. Optional — a schedule with no target is a reusable template. */
export type ScheduleTargetType = 'test' | 'map' | 'batch';

export interface Schedule {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  targetId?: string;
  targetType?: ScheduleTargetType;

  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalMinutes?: number;
  runAt?: string;
  timezone: string;

  /** Wire value is the string `'true'` / `'false'`, not a boolean — it backs a GSI key. */
  enabled: 'true' | 'false';
  lastRunAt?: string;
  nextRunAt: string;
  runCount: number;

  eventBridgeRuleArn?: string;
  eventBridgeRuleName?: string;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateScheduleRequest {
  name: string;
  scheduleType: ScheduleType;
  description?: string;
  targetId?: string;
  targetType?: ScheduleTargetType;
  /** Required when scheduleType is 'cron'. */
  cronExpression?: string;
  /** Required when scheduleType is 'recurring'. Minimum 1. */
  intervalMinutes?: number;
  /** Required when scheduleType is 'once'. ISO timestamp, must be in the future. */
  runAt?: string;
  /** IANA timezone. Defaults server-side to 'UTC'. */
  timezone?: string;
}

export interface UpdateScheduleRequest {
  name?: string;
  description?: string;
  scheduleType?: ScheduleType;
  cronExpression?: string;
  intervalMinutes?: number;
  runAt?: string;
  timezone?: string;
  /** Sent as a boolean; the API coerces it to the `'true'`/`'false'` wire form. */
  enabled?: boolean;
}

export interface ScheduleListParams {
  limit?: number;
  nextToken?: string;
  /** Filter to schedules attached to one target. */
  targetId?: string;
}
