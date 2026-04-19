export interface ProfileItem {
  id: string;
  profileId?: string;
  label: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  items?: ProfileItem[];
  createdAt?: string;
  updatedAt?: string;
  matchedLabels?: string[];
}

export interface CreateProfileRequest {
  name: string;
  description?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  description?: string;
}

export interface AddProfileItemRequest {
  label: string;
  value: string;
}

export interface UpdateProfileItemRequest {
  label?: string;
  value?: string;
}

export interface ProfilesListParams {
  limit?: number;
  nextToken?: string;
}

export interface ProfilesByParametersParams {
  /** Either array of labels or comma-separated string. */
  labels: string | string[];
}

export interface ProfilesByParametersResponse {
  profiles: Profile[];
  count?: number;
}

export interface ProfileParametersResponse {
  parameters: string[];
}
