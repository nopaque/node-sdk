import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { waitFor } from '../polling.js';
import type {
  CreateDigitalConnectorRequest,
  CreateDigitalTestRunRequest,
  CreateDigitalTestRunResponse,
  DigitalConnector,
  DigitalConnectorListParams,
  DigitalConnectorTypeDef,
  DigitalTestRun,
  DigitalTestRunListParams,
  ListDigitalConnectorsResponse,
  ListDigitalTestRunsResponse,
  UpdateDigitalConnectorRequest,
} from '../types/digitalTesting.js';

/** The list response plus the `items`/`nextToken` aliases kept for forward compatibility. */
type ListRunsRaw = Partial<ListDigitalTestRunsResponse> & {
  items?: DigitalTestRun[];
  nextToken?: string | null;
};

type ListConnectorsRaw = Partial<ListDigitalConnectorsResponse> & {
  items?: DigitalConnector[];
  nextToken?: string | null;
};

function connectorQuery(params: DigitalConnectorListParams) {
  const { nextToken, cursor, ...rest } = params;
  return { ...rest, cursor: nextToken ?? cursor };
}

const TERMINAL: ReadonlySet<string> = new Set(['completed', 'failed', 'cancelled']);

/** Mirrors `BatchesWaitForOptions` (`src/resources/batches.ts:15-21`). */
export interface DigitalTestingWaitForOptions {
  timeout?: number;
  pollInterval?: number;
  intervalCap?: number;
  onUpdate?: (run: DigitalTestRun) => void;
  requestOptions?: RequestOptions;
}

/**
 * Digital (chat channel) test runs.
 *
 * @beta Access is limited to beta workspaces during the beta period.
 */
export class DigitalTestingResource extends Resource {
  /**
   * Queue a digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async create(
    body: CreateDigitalTestRunRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalTestRun> {
    // POST returns { message, run } — unwrap the run object.
    const raw = await this.transport.request<
      Partial<CreateDigitalTestRunResponse> & DigitalTestRun
    >('POST', '/digital-testing/runs', { body, requestOptions });
    return raw.run ?? raw;
  }

  /**
   * Paginated list of digital test runs, newest first.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  list(
    params: DigitalTestRunListParams = {},
    requestOptions?: RequestOptions,
  ): Paginator<DigitalTestRun> {
    return new Paginator<DigitalTestRun>({
      fetchPage: async (p) => {
        const { nextToken, cursor, ...rest } = p as DigitalTestRunListParams;
        // Server returns { runs: [...], nextCursor? } rather than { items, nextToken }.
        const raw = await this.transport.request<ListRunsRaw>('GET', '/digital-testing/runs', {
          // `nextToken` first: the Paginator advances by writing it, and a
          // caller-supplied `cursor` would otherwise pin every page to page one.
          params: { ...rest, cursor: nextToken ?? cursor },
          requestOptions,
        });
        return {
          items: raw.runs ?? raw.items ?? [],
          nextToken: raw.nextCursor ?? raw.nextToken ?? null,
        };
      },
      params: { ...params },
    });
  }

  /**
   * One page of digital test runs.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async listPage(
    params: DigitalTestRunListParams = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<DigitalTestRun>> {
    const { nextToken, cursor, ...rest } = params;
    const raw = await this.transport.request<ListRunsRaw>('GET', '/digital-testing/runs', {
      params: { ...rest, cursor: nextToken ?? cursor },
      requestOptions,
    });
    return new Page(raw.runs ?? raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  /**
   * Get one digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async get(runId: string, requestOptions?: RequestOptions): Promise<DigitalTestRun> {
    return await this.transport.request('GET', `/digital-testing/runs/${runId}`, {
      requestOptions,
    });
  }

  /**
   * Cancel a digital test run.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async cancel(runId: string, requestOptions?: RequestOptions): Promise<DigitalTestRun> {
    return await this.transport.request('POST', `/digital-testing/runs/${runId}/cancel`, {
      requestOptions,
    });
  }

  // -------------------------------------------------------------------------
  // Connectors: saved, reusable connection definitions
  // -------------------------------------------------------------------------

  /**
   * GET /digital-testing/connectors — the workspace's connectors, most
   * recently updated first.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  listConnectors(
    params: DigitalConnectorListParams = {},
    requestOptions?: RequestOptions,
  ): Paginator<DigitalConnector> {
    return new Paginator<DigitalConnector>({
      fetchPage: async (p) => {
        const raw = await this.transport.request<ListConnectorsRaw>(
          'GET',
          '/digital-testing/connectors',
          { params: connectorQuery(p as DigitalConnectorListParams), requestOptions },
        );
        return {
          items: raw.connectors ?? raw.items ?? [],
          nextToken: raw.nextCursor ?? raw.nextToken ?? null,
        };
      },
      params: { ...params },
    });
  }

  /**
   * One page of `listConnectors()`.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async listConnectorsPage(
    params: DigitalConnectorListParams = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<DigitalConnector>> {
    const raw = await this.transport.request<ListConnectorsRaw>(
      'GET',
      '/digital-testing/connectors',
      { params: connectorQuery(params), requestOptions },
    );
    return new Page(raw.connectors ?? raw.items ?? [], raw.nextCursor ?? raw.nextToken ?? null);
  }

  /**
   * GET /digital-testing/connectors/{id}.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async getConnector(
    connectorId: string,
    requestOptions?: RequestOptions,
  ): Promise<DigitalConnector> {
    return await this.transport.request('GET', `/digital-testing/connectors/${encodeURIComponent(connectorId)}`, {
      requestOptions,
    });
  }

  /**
   * POST /digital-testing/connectors. `config` is validated against the
   * schema for `type`; see `listConnectorTypes()`.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async createConnector(
    body: CreateDigitalConnectorRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalConnector> {
    return await this.transport.request('POST', '/digital-testing/connectors', {
      body,
      requestOptions,
    });
  }

  /**
   * PATCH /digital-testing/connectors/{id} — partial update of `name`,
   * `description` and `config`. Changing `type` or `targetRef` is a 400.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async updateConnector(
    connectorId: string,
    body: UpdateDigitalConnectorRequest,
    requestOptions?: RequestOptions,
  ): Promise<DigitalConnector> {
    return await this.transport.request('PATCH', `/digital-testing/connectors/${encodeURIComponent(connectorId)}`, {
      body,
      requestOptions,
    });
  }

  /**
   * DELETE /digital-testing/connectors/{id}. Throws `ConflictError` (409)
   * while any saved config still references the connector.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async deleteConnector(connectorId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/digital-testing/connectors/${encodeURIComponent(connectorId)}`, {
      requestOptions,
    });
  }

  /**
   * GET /digital-testing/connector-types — the closed set of connector types,
   * with the config fields each accepts.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async listConnectorTypes(requestOptions?: RequestOptions): Promise<DigitalConnectorTypeDef[]> {
    const raw = await this.transport.request<{ types?: DigitalConnectorTypeDef[] }>(
      'GET',
      '/digital-testing/connector-types',
      { requestOptions },
    );
    return raw.types ?? [];
  }

  /**
   * Poll until the run reaches a terminal state.
   *
   * Resolves on `completed`, `failed` and `cancelled` alike and returns the run.
   * A bot that behaved badly is `completed` with `outcome: 'fail'`, which is a
   * RESULT, not an error — this never throws on it. `failed` means the test could
   * not be delivered.
   *
   * @beta Access is limited to beta workspaces during the beta period.
   */
  async waitForRun(
    runId: string,
    opts: DigitalTestingWaitForOptions = {},
  ): Promise<DigitalTestRun> {
    return await waitFor<DigitalTestRun>({
      fetch: () => this.get(runId, opts.requestOptions),
      isTerminal: (r) => TERMINAL.has(r.status),
      timeout: opts.timeout,
      initialInterval: opts.pollInterval,
      intervalCap: opts.intervalCap,
      onUpdate: opts.onUpdate,
    });
  }
}
