import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  CreateScheduleRequest,
  Schedule,
  ScheduleListParams,
  UpdateScheduleRequest,
} from '../types/scheduler.js';

export class SchedulerResource extends Resource {
  async create(
    body: CreateScheduleRequest,
    requestOptions?: RequestOptions
  ): Promise<Schedule> {
    return await this.transport.request('POST', '/schedules', { body, requestOptions });
  }

  list(
    params: ScheduleListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<Schedule> {
    return new Paginator<Schedule>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/schedules', { params: p, requestOptions }),
      params: { ...params },
      itemsKey: 'schedules',
    });
  }

  async listPage(
    params: ScheduleListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<Schedule>> {
    const raw = await this.transport.request<{
      schedules?: Schedule[];
      items?: Schedule[];
      nextToken?: string | null;
    }>('GET', '/schedules', { params, requestOptions });
    return new Page(raw.schedules ?? raw.items ?? [], raw.nextToken ?? null);
  }

  async get(scheduleId: string, requestOptions?: RequestOptions): Promise<Schedule> {
    return await this.transport.request('GET', `/schedules/${scheduleId}`, { requestOptions });
  }

  async update(
    scheduleId: string,
    body: UpdateScheduleRequest,
    requestOptions?: RequestOptions
  ): Promise<Schedule> {
    return await this.transport.request('PUT', `/schedules/${scheduleId}`, { body, requestOptions });
  }

  async delete(scheduleId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/schedules/${scheduleId}`, { requestOptions });
  }

  async pause(
    scheduleId: string,
    requestOptions?: RequestOptions
  ): Promise<Schedule> {
    return await this.transport.request('POST', `/schedules/${scheduleId}/pause`, {
      requestOptions,
    });
  }

  async resume(
    scheduleId: string,
    requestOptions?: RequestOptions
  ): Promise<Schedule> {
    return await this.transport.request('POST', `/schedules/${scheduleId}/resume`, {
      requestOptions,
    });
  }
}
