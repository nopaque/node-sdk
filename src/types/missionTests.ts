export type MissionTestKind = 'freeform' | 'compliance';
// 'pending' is what the api sends; 'queued' is kept for compatibility.
export type MissionTestStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface MissionTestProfile {
  phoneNumber: string;
  name?: string;
}

export interface CreateMissionTestRequest {
  sector: string;
  mission: string;
  acceptance: string;
  profile: MissionTestProfile;
}

/**
 * A mission or compliance run, as GET /testing/mission-tests returns it.
 * Required fields match openapi `MissionTestRun`. Runs launched from a saved
 * config carry no `kind`, `createdAt` or `updatedAt`, and `profile` is the
 * profile ID string.
 */
export interface MissionTestRun {
  id: string;
  workspaceId: string;
  testType?: 'mission';
  status: MissionTestStatus;
  startedAt?: string;
  completedAt?: string;
  kind?: MissionTestKind;
  sector?: string;
  mission?: string;
  acceptance?: string;
  /** Profile ID string from the api; the object form is kept for compatibility. */
  profile?: string | MissionTestProfile;
  phoneNumber?: string;
  configId?: string;
  voiceId?: string;
  passed?: boolean;
  passReasoning?: string;
  passEvidence?: string;
  verdict?: 'pass' | 'fail';
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MissionTestDefaults {
  sector: string;
  mission: string;
  acceptance: string;
  catalogueVersion: string;
}

/** Filters for GET /testing/mission-tests. All are applied server-side. */
export interface MissionTestListParams {
  /** `'freeform'` (missions) or `'compliance'`. */
  kind?: MissionTestKind;
  /** Only runs launched from this mission test config. Needs the API's `configId` filter. */
  configId?: string;
  /** Case-insensitive text search on the run's sector or mission. */
  q?: string;
  /** Substring match on the number called. */
  phoneNumber?: string;
  /** Runs whose config has ANY of these tags. A comma-separated string or an array. */
  tags?: string | string[];
  limit?: number;
  /** Cursor from a previous page's `nextToken`. */
  nextToken?: string;
  /** The api's own name for the cursor; either works. */
  cursor?: string;
}
