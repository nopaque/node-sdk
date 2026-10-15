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

export interface MissionTestListParams {
  limit?: number;
  /** Cursor from a previous page's `nextToken`. */
  nextToken?: string;
  /** The api's own name for the cursor; either works. */
  cursor?: string;
}
