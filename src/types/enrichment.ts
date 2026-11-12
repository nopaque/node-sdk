export type EnrichmentStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface EnrichmentDimensions {
  accessibility?: number;
  clarity?: number;
  efficiency?: number;
  completeness?: number;
  professionalism?: number;
  [key: string]: number | undefined;
}

/** One scored dimension in a v2 quality score. */
export interface QualityDimensionScore {
  key: string;
  label: string;
  score: number;
  rationale: string;
  weight: number;
  appliesTo: 'voice' | 'dtmf' | 'hybrid' | 'shared';
}

export interface QualityScoringResults {
  schemaVersion?: number;
  mode?: string;
  overallScore?: number;
  sentiment?: string;
  comparabilityNote?: string;
  /** An array of scored dimensions on v2 scores; a map of scores on older ones. */
  dimensions?: QualityDimensionScore[] | EnrichmentDimensions;
  rationale?: string;
  [key: string]: unknown;
}

/**
 * One enrichment of a mapping run, as `enrichment.get()` returns it.
 *
 * The API returns a **completed** enrichment as its result alone, unwrapped,
 * and anything else (queued, running, failed) as the stored record with
 * `status`, `data` and `error`. The SDK brings both to this shape: `results`
 * holds the result (undefined until there is one), `status` is `'completed'`
 * for an unwrapped result, and `jobId`, `runId` and `type` come from the
 * request. An unwrapped result's own fields stay at the top level too.
 */
export interface Enrichment {
  jobId: string;
  runId: string;
  type: string;
  status: EnrichmentStatus;
  results?: QualityScoringResults | Record<string, unknown>;
  /** Present when the enrichment has not completed. */
  enrichmentId?: string;
  enrichmentType?: string;
  data?: Record<string, unknown>;
  error?: string;
  completedAt?: string;
  [key: string]: unknown;
}

export interface TokenUsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** Token totals for one service, and how many usage events made them up. */
export interface ServiceTokenUsage extends TokenUsageTotals {
  eventCount: number;
}

/** The 0.14.0 summary, now filled from `services` and `total` (each service's `totalTokens`). */
export interface TokenUsageDetails {
  ivrAnalysisTokens?: number;
  qualityScoringTokens?: number;
  totalTokens?: number;
  [key: string]: number | undefined;
}

/**
 * Response from GET /mapping/{jobId}/runs/{runId}/token-usage. `services` is
 * keyed by service (`ivr_analysis`, `quality_scoring`); `total` sums them.
 * `jobId` and `usage` are filled in by the SDK.
 */
export interface TokenUsageResponse {
  jobId: string;
  runId: string;
  services: Record<string, ServiceTokenUsage>;
  total: TokenUsageTotals;
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
