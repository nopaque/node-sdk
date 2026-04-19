import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import type {
  Enrichment,
  EnrichRequest,
  EnrichResponse,
  TokenUsageResponse,
} from '../types/enrichment.js';

export class EnrichmentResource extends Resource {
  async get(
    jobId: string,
    runId: string,
    type: string,
    requestOptions?: RequestOptions
  ): Promise<Enrichment> {
    return await this.transport.request(
      'GET',
      `/mapping/${jobId}/runs/${runId}/enrichments/${encodeURIComponent(type)}`,
      { requestOptions }
    );
  }

  async tokenUsage(
    jobId: string,
    runId: string,
    requestOptions?: RequestOptions
  ): Promise<TokenUsageResponse> {
    return await this.transport.request(
      'GET',
      `/mapping/${jobId}/runs/${runId}/token-usage`,
      { requestOptions }
    );
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
