import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  AddProfileItemRequest,
  CreateProfileRequest,
  Profile,
  ProfileItem,
  ProfileParametersResponse,
  ProfilesByParametersParams,
  ProfilesByParametersResponse,
  ProfilesListParams,
  UpdateProfileItemRequest,
  UpdateProfileRequest,
} from '../types/profiles.js';

export class ProfilesResource extends Resource {
  async create(
    body: CreateProfileRequest,
    requestOptions?: RequestOptions
  ): Promise<Profile> {
    return await this.transport.request('POST', '/profiles', { body, requestOptions });
  }

  list(
    params: ProfilesListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<Profile> {
    return new Paginator<Profile>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/profiles', { params: p, requestOptions }),
      params: { ...params },
      itemsKey: 'profiles',
    });
  }

  async listPage(
    params: ProfilesListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<Profile>> {
    const raw = await this.transport.request<{
      profiles?: Profile[];
      items?: Profile[];
      nextToken?: string | null;
    }>('GET', '/profiles', { params, requestOptions });
    return new Page(raw.profiles ?? raw.items ?? [], raw.nextToken ?? null);
  }

  async get(profileId: string, requestOptions?: RequestOptions): Promise<Profile> {
    return await this.transport.request('GET', `/profiles/${profileId}`, { requestOptions });
  }

  async update(
    profileId: string,
    body: UpdateProfileRequest,
    requestOptions?: RequestOptions
  ): Promise<Profile> {
    return await this.transport.request('PUT', `/profiles/${profileId}`, { body, requestOptions });
  }

  async delete(profileId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/profiles/${profileId}`, { requestOptions });
  }

  async addItem(
    profileId: string,
    body: AddProfileItemRequest,
    requestOptions?: RequestOptions
  ): Promise<ProfileItem> {
    return await this.transport.request('POST', `/profiles/${profileId}/items`, {
      body,
      requestOptions,
    });
  }

  async updateItem(
    profileId: string,
    itemId: string,
    body: UpdateProfileItemRequest,
    requestOptions?: RequestOptions
  ): Promise<ProfileItem> {
    return await this.transport.request('PUT', `/profiles/${profileId}/items/${itemId}`, {
      body,
      requestOptions,
    });
  }

  async deleteItem(
    profileId: string,
    itemId: string,
    requestOptions?: RequestOptions
  ): Promise<void> {
    await this.transport.request(
      'DELETE',
      `/profiles/${profileId}/items/${itemId}`,
      { requestOptions }
    );
  }

  async listParameters(
    requestOptions?: RequestOptions
  ): Promise<ProfileParametersResponse> {
    return await this.transport.request('GET', '/profiles/parameters', { requestOptions });
  }

  async findByParameters(
    params: ProfilesByParametersParams,
    requestOptions?: RequestOptions
  ): Promise<ProfilesByParametersResponse> {
    const labels = Array.isArray(params.labels) ? params.labels.join(',') : params.labels;
    return await this.transport.request('GET', '/profiles/by-parameters', {
      params: { labels },
      requestOptions,
    });
  }
}
