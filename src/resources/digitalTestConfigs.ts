import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  CreateDigitalTestConfigRequest,
  DigitalTestConfig,
  DigitalTestConfigListParams,
  DigitalTestRun,
  LaunchDigitalTestConfigRequest,
  UpdateDigitalTestConfigRequest,
} from '../types/digitalTesting.js';

/**
 * Saved digital (chat channel) test configs.
 *
 * @beta Access is limited to beta workspaces during the beta period.
 */
export class DigitalTestConfigsResource extends Resource {
  /** @beta Access is limited to beta workspaces during the beta period. */
  list(
    params: DigitalTestConfigListParams = {},
    requestOptions?: RequestOptions,
  ): Paginator<DigitalTestConfig> {
    return new Paginator<DigitalTestConfig>({
      fetchPage: async (p) => {
        const { nextToken, cursor, ...rest } = p as DigitalTestConfigListParams;
        // Server returns { configs: [...], nextCursor? }.
        const raw = await this.transport.request<{
          configs?: DigitalTestConfig[];
          items?: DigitalTestConfig[];
          nextCursor?: string | null;
          nextToken?: string | null;
        }>('GET', '/digital-testing/configs', {
          params: { ...rest, cursor: cursor ?? nextToken },
          requestOptions,
        });
        return {
          items: raw.configs ?? raw.items ?? [],
          nextToken: raw.nextCursor ?? raw.nextToken ?? null,
        };
      },
      params: { ...params },
    });
  }

  /** @beta Access is limited to beta workspaces during the beta period. */
  async listPage(
    params: DigitalTestConfigListParams = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<DigitalTestConfig>> {
    const { nextToken, cursor, ...rest } = params;
    const raw = await this.transport.request<{
      configs?: DigitalTestConfig[];
      items?: DigitalTestConfig[];
      nextCursor?: string | null;
      nextToken?: string | null;
    }>('GET', '/digital-testing/configs', {
      params: { ...rest, cursor: cursor ?? nextToken },
      requestOptions,
    });
    return new Page(raw.configs ?? raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  /**
   * Save a digital test config. Per-kind rules are enforced at SAVE time, so a
   * config that could never run is rejected with 400 rather than stored.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async create(
    body: CreateDigitalTestConfigRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestConfig> {
    return await this.transport.request('POST', '/digital-testing/configs', {
      body,
      requestOptions,
    });
  }

  /** @beta Access is limited to beta workspaces during the beta period. */
  async get(configId: string, requestOptions?: RequestOptions): Promise<DigitalTestConfig> {
    return await this.transport.request('GET', `/digital-testing/configs/${configId}`, {
      requestOptions,
    });
  }

  /** @beta Access is limited to beta workspaces during the beta period. */
  async update(
    configId: string,
    body: UpdateDigitalTestConfigRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestConfig> {
    return await this.transport.request('PATCH', `/digital-testing/configs/${configId}`, {
      body,
      requestOptions,
    });
  }

  /** @beta Access is limited to beta workspaces during the beta period. */
  async delete(configId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/digital-testing/configs/${configId}`, {
      requestOptions,
    });
  }

  /**
   * Launch a run from a saved config. `target` and `targetRef` must be
   * overridden together — a half-override is a 400.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async launch(
    configId: string,
    body: LaunchDigitalTestConfigRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestRun> {
    const raw = await this.transport.request<
      { message?: string; run?: DigitalTestRun } & DigitalTestRun
    >('POST', `/digital-testing/configs/${configId}/runs`, { body, requestOptions });
    return raw.run ?? raw;
  }
}
