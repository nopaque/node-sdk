export interface CreateMissionTestConfigRequest {
  name: string;
  sector: string;
  mission: string;
  acceptance: string;
  profileId: string;
}

export interface MissionTestConfig {
  id: string;
  workspaceId: string;
  name: string;
  sector: string;
  mission: string;
  acceptance: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissionTestConfigListParams {
  limit?: number;
  nextToken?: string;
}
