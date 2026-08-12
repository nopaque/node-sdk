import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import type { DigitalComplianceAuditSummary } from '../types/digitalTesting.js';

/**
 * Digital (chat channel) compliance audits.
 *
 * @beta Access is limited to beta workspaces during the beta period.
 */
export class DigitalComplianceResource extends Resource {
  /**
   * List digital compliance audits, one entry per target.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async listAudits(requestOptions?: RequestOptions): Promise<DigitalComplianceAuditSummary[]> {
    const raw = await this.transport.request<{ audits?: DigitalComplianceAuditSummary[] }>(
      'GET',
      '/digital-testing/compliance-audits',
      { requestOptions },
    );
    return raw.audits ?? [];
  }

  /**
   * Compliance report for one digital target.
   *
   * `targetRef` goes in the QUERY STRING, not the path: a targetRef contains
   * slashes (`acme/billing-bot`) and a single path segment cannot hold one. The
   * API made the same choice for the same reason.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async getReport(targetRef: string, requestOptions?: RequestOptions): Promise<unknown> {
    return await this.transport.request('GET', '/digital-testing/compliance-audits/report', {
      params: { targetRef },
      requestOptions,
    });
  }
}
