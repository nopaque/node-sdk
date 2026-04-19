export interface Dataset {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDatasetRequest {
  name: string;
  description?: string;
}

export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
}

export interface DatasetsListParams {
  limit?: number;
  nextToken?: string;
}

export interface ResolvedDatasetEntry {
  phoneNumber?: string;
  name?: string;
  [key: string]: unknown;
}

export interface ResolvedDataset {
  datasetId: string;
  resolvedEntries: ResolvedDatasetEntry[];
}
