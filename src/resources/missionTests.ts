import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  CreateMissionTestRequest,
  MissionTestDefaults,
  MissionTestListParams,
  MissionTestRun,
} from '../types/missionTests.js';

export class MissionTestsResource extends Resource {
  list(
    params: MissionTestListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<MissionTestRun> {
    return new Paginator<MissionTestRun>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/testing/mission-tests', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listPage(
    params: MissionTestListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<MissionTestRun>> {
    const raw = await this.transport.request<{ items: MissionTestRun[]; nextToken: string | null }>(
      'GET',
      '/testing/mission-tests',
      { params, requestOptions },
    );
    return new Page(raw.items, raw.nextToken);
  }

  async create(
    body: CreateMissionTestRequest,
    requestOptions?: RequestOptions
  ): Promise<MissionTestRun> {
    return await this.transport.request('POST', '/testing/mission-tests', { body, requestOptions });
  }

  // Returns 503 with code='CATALOG_NOT_READY' until the mission-tester service
  // publishes its SSM payload. Callers can catch and retry, or fall back to a
  // known-good default sector/mission/acceptance.
  async getDefaults(requestOptions?: RequestOptions): Promise<MissionTestDefaults> {
    return await this.transport.request('GET', '/testing/mission-tests/defaults', { requestOptions });
  }

  async get(id: string, requestOptions?: RequestOptions): Promise<MissionTestRun> {
    return await this.transport.request('GET', `/testing/mission-tests/${id}`, { requestOptions });
  }

  async cancel(id: string, requestOptions?: RequestOptions): Promise<MissionTestRun> {
    return await this.transport.request('POST', `/testing/mission-tests/${id}/cancel`, { requestOptions });
  }
}
