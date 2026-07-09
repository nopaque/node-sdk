export interface CreateMissionTestConfigRequest {
  name: string;
  description?: string;
  sector: string;
  mission: string;
  acceptance: string;
  profileId: string;
  phoneNumber?: string;
  /** User-defined labels (max 10, lowercase kebab-case). */
  tags?: string[];
}

/**
 * Partial update for `PATCH /testing/mission-test-configs/{id}`. At least one
 * field must be provided. `description` and `tags` accept `null` to clear.
 */
export interface UpdateMissionTestConfigRequest {
  name?: string;
  description?: string | null;
  phoneNumber?: string;
  sector?: string;
  mission?: string;
  acceptance?: string;
  profileId?: string;
  tags?: string[] | null;
}

export interface MissionTestConfig {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  phoneNumber?: string;
  sector: string;
  mission: string;
  acceptance: string;
  profileId: string;
  /** User-defined labels (max 10, lowercase kebab-case). */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Slim projection returned by `missionTestConfigs.list()`. Drops the long-text
 * `mission` and `acceptance` fields — fetch the full row with `get()`.
 */
export interface MissionTestConfigListItem {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  phoneNumber?: string;
  sector: string;
  profileId: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MissionTestConfigListParams {
  name?: string;
  phoneNumber?: string;
  sector?: string;
  profileId?: string;
  /** Single lowercase tag exact match. */
  tag?: string;
  /** ISO8601 datetime. */
  createdAfter?: string;
  /** ISO8601 datetime. */
  createdBefore?: string;
  sort?: 'createdAt' | 'name';
  sortDir?: 'asc' | 'desc';
  /** Results per page (1..100, default 50). */
  limit?: number;
  /** Opaque pagination cursor. */
  cursor?: string;
  /** @deprecated Back-compat alias for `cursor`. */
  nextToken?: string;
}
