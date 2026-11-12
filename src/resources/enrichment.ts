import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import type {
  Enrichment,
  EnrichmentStatus,
  EnrichRequest,
  EnrichResponse,
  TokenUsageResponse,
} from '../types/enrichment.js';

// A completed enrichment comes back as its result alone, unwrapped; anything
// else as the stored record (`enrichmentId`, `enrichmentType`, `status`,
// `data`, `error`). Both are brought to the `Enrichment` shape.
function toEnrichment(
  raw: Record<string, unknown>,
  jobId: string,
  runId: string,
  type: string
): Enrichment {
  const isRecord = 'enrichmentType' in raw || 'enrichmentId' in raw;
  if (isRecord) {
    return {
      ...raw,
      jobId: (raw.jobId as string | undefined) ?? jobId,
      runId: (raw.runId as string | undefined) ?? runId,
      type: (raw.enrichmentType as string | undefined) ?? type,
      status: raw.status as EnrichmentStatus,
      results: (raw.results ?? raw.data ?? undefined) as Record<string, unknown> | undefined,
    };
  }
  return { ...raw, jobId, runId, type, status: 'completed', results: { ...raw } };
}

type RawTokenUsage = Omit<TokenUsageResponse, 'jobId' | 'usage'> & Partial<TokenUsageResponse>;

function toTokenUsage(raw: RawTokenUsage, jobId: string): TokenUsageResponse {
  const services = raw.services ?? {};
  return {
    ...raw,
    jobId: raw.jobId ?? jobId,
    usage: raw.usage ?? {
      ivrAnalysisTokens: services.ivr_analysis?.totalTokens,
      qualityScoringTokens: services.quality_scoring?.totalTokens,
      totalTokens: raw.total?.totalTokens,
    },
  };
}

export class EnrichmentResource extends Resource {
  async get(
    jobId: string,
    runId: string,
    type: string,
    requestOptions?: RequestOptions
  ): Promise<Enrichment> {
    const raw = await this.transport.request<Record<string, unknown>>(
      'GET',
      `/mapping/${jobId}/runs/${runId}/enrichments/${encodeURIComponent(type)}`,
      { requestOptions }
    );
    return toEnrichment(raw, jobId, runId, type);
  }

  async tokenUsage(
    jobId: string,
    runId: string,
    requestOptions?: RequestOptions
  ): Promise<TokenUsageResponse> {
    const raw = await this.transport.request<RawTokenUsage>(
      'GET',
      `/mapping/${jobId}/runs/${runId}/token-usage`,
      { requestOptions }
    );
    return toTokenUsage(raw, jobId);
  }

  async enrich(
    jobId: string,
    runId: string,
    body?: EnrichRequest,
    requestOptions?: RequestOptions
  ): Promise<EnrichResponse> {
    return await this.transport.request(
      'POST',
      `/mapping/${jobId}/runs/${runId}/enrich`,
      { body, requestOptions }
    );
  }
}
