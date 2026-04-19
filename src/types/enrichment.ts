export type EnrichmentStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface EnrichmentDimensions {
  accessibility?: number;
  clarity?: number;
  efficiency?: number;
  completeness?: number;
  professionalism?: number;
  [key: string]: number | undefined;
}

export interface QualityScoringResults {
  overallScore?: number;
  sentiment?: string;
  dimensions?: EnrichmentDimensions;
  rationale?: string;
  [key: string]: unknown;
}

export interface Enrichment {
  jobId: string;
  runId: string;
  type: string;
  status: EnrichmentStatus;
  results?: QualityScoringResults | Record<string, unknown>;
  [key: string]: unknown;
}

export interface TokenUsageDetails {
  ivrAnalysisTokens?: number;
  qualityScoringTokens?: number;
  totalTokens?: number;
  [key: string]: number | undefined;
}

export interface TokenUsageResponse {
  jobId: string;
  runId: string;
  usage: TokenUsageDetails;
}

export interface EnrichRequest {
  /** Optional set of enrichment types to queue. Server chooses defaults when omitted. */
  enrichmentTypes?: string[];
}

export interface EnrichResponse {
  jobId: string;
  runId: string;
  status: EnrichmentStatus;
  enrichmentTypes: string[];
  queuedAt?: string;
  [key: string]: unknown;
}
