import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  CreateMissionTestConfigRequest,
  MissionTestConfig,
  MissionTestConfigListItem,
  MissionTestConfigListParams,
  UpdateMissionTestConfigRequest,
} from '../types/missionTestConfigs.js';
import type { MissionTestRun } from '../types/missionTests.js';

export class MissionTestConfigsResource extends Resource {
  list(
    params: MissionTestConfigListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<MissionTestConfigListItem> {
    return new Paginator<MissionTestConfigListItem>({
      fetchPage: async (p) => {
        const { nextToken, cursor, ...rest } = p as MissionTestConfigListParams & {
          nextToken?: string;
        };
        const raw = await this.transport.request<{
          items?: MissionTestConfigListItem[];
          nextCursor?: string | null;
          nextToken?: string | null;
        }>('GET', '/testing/mission-test-configs', {
          params: { ...rest, cursor: cursor ?? nextToken },
          requestOptions,
        });
        return { items: raw.items ?? [], nextToken: raw.nextCursor ?? raw.nextToken ?? null };
      },
      params: { ...params },
    });
  }

  async listPage(
    params: MissionTestConfigListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<MissionTestConfigListItem>> {
    const { nextToken, cursor, ...rest } = params;
    const raw = await this.transport.request<{
      items?: MissionTestConfigListItem[];
      nextCursor?: string | null;
      nextToken?: string | null;
    }>('GET', '/testing/mission-test-configs', {
      params: { ...rest, cursor: cursor ?? nextToken },
      requestOptions,
    });
    return new Page(raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  async create(
    body: CreateMissionTestConfigRequest,
    requestOptions?: RequestOptions
  ): Promise<MissionTestConfig> {
    return await this.transport.request('POST', '/testing/mission-test-configs', { body, requestOptions });
  }

  async get(id: string, requestOptions?: RequestOptions): Promise<MissionTestConfig> {
    return await this.transport.request('GET', `/testing/mission-test-configs/${id}`, { requestOptions });
  }

  async update(
    id: string,
    body: UpdateMissionTestConfigRequest,
    requestOptions?: RequestOptions
  ): Promise<MissionTestConfig> {
    return await this.transport.request('PATCH', `/testing/mission-test-configs/${id}`, {
      body,
      requestOptions,
    });
  }

  async delete(id: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/mission-test-configs/${id}`, { requestOptions });
  }

  // Launch a mission test run from a saved config. The returned run is freeform-shaped.
  async run(id: string, requestOptions?: RequestOptions): Promise<MissionTestRun> {
    return await this.transport.request('POST', `/testing/mission-test-configs/${id}/runs`, { requestOptions });
  }
}
