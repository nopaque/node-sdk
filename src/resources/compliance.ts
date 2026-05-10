import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  ComplianceCatalogueResponse,
  ComplianceReport,
  ComplianceReportListItem,
  ComplianceReportListParams,
  CreateComplianceBatchRequest,
  CreateComplianceBatchResponse,
  GeneratePdfRequest,
  GeneratePdfResponse,
} from '../types/compliance.js';
import type { MissionTestRun } from '../types/missionTests.js';

// Path interpolation in Transport is direct (no automatic encoding), so the
// E.164 leading `+` must be encoded at the resource boundary or it will reach
// the gateway as a space.
function encodePhone(phoneNumber: string): string {
  return encodeURIComponent(phoneNumber);
}

export class ComplianceResource extends Resource {
  async getCatalogue(
    params: { sector?: string } = {},
    requestOptions?: RequestOptions,
  ): Promise<ComplianceCatalogueResponse> {
    return await this.transport.request('GET', '/testing/compliance-catalogue', { params, requestOptions });
  }

  // Atomic batch dispatch. Server enforces compliancePickerLimits[tier] on
  // testIds.length and returns 402 with code='BATCH_SIZE_EXCEEDS_TIER' on
  // overflow. Surfaces as a typed NopaqueAPIError with code preserved.
  async run(
    body: CreateComplianceBatchRequest,
    requestOptions?: RequestOptions,
  ): Promise<CreateComplianceBatchResponse> {
    return await this.transport.request('POST', '/testing/compliance-runs', { body, requestOptions });
  }

  listReports(
    params: ComplianceReportListParams = {},
    requestOptions?: RequestOptions,
  ): Paginator<ComplianceReportListItem> {
    return new Paginator<ComplianceReportListItem>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/compliance-reports', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listReportsPage(
    params: ComplianceReportListParams = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<ComplianceReportListItem>> {
    const raw = await this.transport.request<{
      items: ComplianceReportListItem[];
      nextToken: string | null;
    }>('GET', '/testing/compliance-reports', { params, requestOptions });
    return new Page(raw.items, raw.nextToken);
  }

  async getReport(phoneNumber: string, requestOptions?: RequestOptions): Promise<ComplianceReport> {
    return await this.transport.request(
      'GET',
      `/testing/compliance-reports/${encodePhone(phoneNumber)}`,
      { requestOptions },
    );
  }

  // Returns the presigned S3 URL the platform uploaded the PDF to. The 1 hour
  // expiry is baked into the URL itself; the response body is `{ url }` only.
  async generatePdfUrl(
    phoneNumber: string,
    body: GeneratePdfRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<GeneratePdfResponse> {
    return await this.transport.request(
      'POST',
      `/testing/compliance-reports/${encodePhone(phoneNumber)}/pdf`,
      { body, requestOptions },
    );
  }

  // Convenience: get the URL, then fetch the bytes. For applications that
  // already have an HTTP client, prefer generatePdfUrl() and fetch the URL
  // with that client instead.
  async downloadReportPdf(
    phoneNumber: string,
    body: GeneratePdfRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<Uint8Array> {
    const { url } = await this.generatePdfUrl(phoneNumber, body, requestOptions);
    // Use the SDK's configured fetch so tests can mock it through the same
    // queue as transport calls, and so consumers can swap the network layer.
    const response = await this.transport.config.fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async rerun(runId: string, requestOptions?: RequestOptions): Promise<MissionTestRun> {
    return await this.transport.request('POST', `/testing/compliance-runs/${runId}/rerun`, { requestOptions });
  }
}
