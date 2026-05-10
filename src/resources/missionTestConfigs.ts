import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  CreateMissionTestConfigRequest,
  MissionTestConfig,
  MissionTestConfigListParams,
} from '../types/missionTestConfigs.js';
import type { MissionTestRun } from '../types/missionTests.js';

export class MissionTestConfigsResource extends Resource {
  list(
    params: MissionTestConfigListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<MissionTestConfig> {
    return new Paginator<MissionTestConfig>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/mission-test-configs', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listPage(
    params: MissionTestConfigListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<MissionTestConfig>> {
    const raw = await this.transport.request<{ items: MissionTestConfig[]; nextToken: string | null }>(
      'GET',
      '/testing/mission-test-configs',
      { params, requestOptions },
    );
    return new Page(raw.items, raw.nextToken);
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

  async delete(id: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/testing/mission-test-configs/${id}`, { requestOptions });
  }

  // Launch a mission test run from a saved config. The returned run is freeform-shaped.
  async run(id: string, requestOptions?: RequestOptions): Promise<MissionTestRun> {
    return await this.transport.request('POST', `/testing/mission-test-configs/${id}/runs`, { requestOptions });
  }
}
