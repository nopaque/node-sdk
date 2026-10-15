import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  CreateMissionTestRequest,
  MissionTestDefaults,
  MissionTestListParams,
  MissionTestRun,
} from '../types/missionTests.js';

// The api returns `{runs, nextCursor}` and pages on `cursor`; the paginator
// works in `{items, nextToken}`, so both directions are translated here.
type RunsPage = { runs?: MissionTestRun[]; nextCursor?: string | null };

function toQuery(params: MissionTestListParams & { nextToken?: string }) {
  const { nextToken, cursor, tags, ...rest } = params;
  return {
    ...rest,
    tags: Array.isArray(tags) ? tags.join(',') : tags,
    cursor: cursor ?? nextToken,
  };
}

export class MissionTestsResource extends Resource {
  list(
    params: MissionTestListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<MissionTestRun> {
    return new Paginator<MissionTestRun>({
      fetchPage: async (p) => {
        const raw = await this.transport.request<RunsPage>('GET', '/testing/mission-tests', {
          params: toQuery(p as MissionTestListParams),
          requestOptions,
        });
        return { items: raw.runs ?? [], nextToken: raw.nextCursor ?? null };
      },
      params: { ...params },
    });
  }

  async listPage(
    params: MissionTestListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<MissionTestRun>> {
    const raw = await this.transport.request<RunsPage>('GET', '/testing/mission-tests', {
      params: toQuery(params),
      requestOptions,
    });
    return new Page(raw.runs ?? [], raw.nextCursor ?? null);
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
