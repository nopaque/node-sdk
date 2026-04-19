import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import type {
  CreateDatasetRequest,
  Dataset,
  DatasetsListParams,
  ResolvedDataset,
  UpdateDatasetRequest,
} from '../types/datasets.js';

export class DatasetsResource extends Resource {
  async create(
    body: CreateDatasetRequest,
    requestOptions?: RequestOptions
  ): Promise<Dataset> {
    return await this.transport.request('POST', '/datasets', { body, requestOptions });
  }

  list(
    params: DatasetsListParams = {},
    requestOptions?: RequestOptions
  ): Paginator<Dataset> {
    return new Paginator<Dataset>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/datasets', { params: p, requestOptions }),
      params: { ...params },
    });
  }

  async listPage(
    params: DatasetsListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<Dataset>> {
    const raw = await this.transport.request<{ items: Dataset[]; nextToken: string | null }>(
      'GET', '/datasets', { params, requestOptions }
    );
    return new Page(raw.items, raw.nextToken);
  }

  async get(datasetId: string, requestOptions?: RequestOptions): Promise<Dataset> {
    return await this.transport.request('GET', `/datasets/${datasetId}`, { requestOptions });
  }

  async update(
    datasetId: string,
    body: UpdateDatasetRequest,
    requestOptions?: RequestOptions
  ): Promise<Dataset> {
    return await this.transport.request('PUT', `/datasets/${datasetId}`, { body, requestOptions });
  }

  async delete(datasetId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/datasets/${datasetId}`, { requestOptions });
  }

  async resolve(
    datasetId: string,
    requestOptions?: RequestOptions
  ): Promise<ResolvedDataset> {
    return await this.transport.request('GET', `/datasets/${datasetId}/resolve`, {
      requestOptions,
    });
  }
}
