/**
 * Profile items are a discriminated union on `type`. A voice item points at an
 * uploaded audio row; a data item points at an item inside a dataset. Branch on
 * `type` before reaching for `audioId` or `datasetId`.
 */
export interface ProfileVoiceItemBase {
  id: string;
  /**
   * Legacy display label. Deprecated server-side and no longer written — for
   * data items the label is derived from the dataset item's key at read time,
   * so it is frequently absent. Do not rely on it.
   */
  label?: string;
  description?: string;
}

export interface ProfileVoiceItem extends ProfileVoiceItemBase {
  type: 'voice';
  audioId: string;
}

export interface ProfileDataItem extends ProfileVoiceItemBase {
  type: 'data';
  datasetId: string;
  itemId: string;
}

export type ProfileItem = ProfileVoiceItem | ProfileDataItem;

export interface Profile {
  id: string;
  workspaceId?: string;
  name: string;
  description?: string;
  items?: ProfileItem[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CreateProfileRequest {
  name: string;
  description?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  description?: string;
}

/**
 * Body for `POST /profiles/{id}/items`. `type` selects which id field the API
 * requires, and `label` is required by this legacy route even though the field
 * is deprecated on the stored item.
 */
export type AddProfileItemRequest =
  | { type: 'voice'; audioId: string; label: string; description?: string }
  | { type: 'data'; datasetId: string; itemId: string; label: string; description?: string };

/** Body for `PUT /profiles/{id}/items/{itemId}`. Only these two are read. */
export interface UpdateProfileItemRequest {
  label?: string;
  description?: string;
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
