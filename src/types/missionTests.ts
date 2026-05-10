export type MissionTestKind = 'freeform' | 'compliance';
export type MissionTestStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

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

export interface MissionTestRun {
  id: string;
  workspaceId: string;
  kind: MissionTestKind;
  sector: string;
  mission: string;
  acceptance: string;
  profile: MissionTestProfile;
  status: MissionTestStatus;
  verdict?: 'pass' | 'fail';
  createdAt: string;
  updatedAt: string;
}

export interface MissionTestDefaults {
  sector: string;
  mission: string;
  acceptance: string;
  catalogueVersion: string;
}

export interface MissionTestListParams {
  limit?: number;
  nextToken?: string;
}
