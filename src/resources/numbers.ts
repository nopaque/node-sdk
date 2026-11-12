import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import type {
  AvailableNumbersParams,
  AvailableNumbersResponse,
  CreateNumberOrderRequest,
  ListNumbersResponse,
  NumberOrder,
  NumberOrderResponse,
  NumberRequirementsParams,
  NumberRequirementsResponse,
  PhoneNumber,
  ReleaseNumberResponse,
  UpdateNumberRequest,
} from '../types/numbers.js';

/** Phone numbers the workspace rents: caller IDs and test destinations. */
export class NumbersResource extends Resource {
  /**
   * GET /numbers — every number the workspace holds, newest first, with the
   * workspace's allowance. Not paginated. A workspace with no numbers gets an
   * empty list.
   */
  async list(requestOptions?: RequestOptions): Promise<ListNumbersResponse> {
    return await this.transport.request('GET', '/numbers', { requestOptions });
  }

  /**
   * GET /numbers/available — numbers available to buy, with prices. Omit
   * `phoneNumberType` to search every type that can do the job, cheapest
   * first. An empty `numbers` list is a real answer, not an error.
   */
  async listAvailable(
    params: AvailableNumbersParams,
    requestOptions?: RequestOptions
  ): Promise<AvailableNumbersResponse> {
    return await this.transport.request('GET', '/numbers/available', { params, requestOptions });
  }

  /**
   * GET /numbers/requirements — the regulatory items a country demands for a
   * number type. Information only: nopaque satisfies every item, and nothing
   * is asked of the customer.
   */
  async getRequirements(
    params: NumberRequirementsParams,
    requestOptions?: RequestOptions
  ): Promise<NumberRequirementsResponse> {
    return await this.transport.request('GET', '/numbers/requirements', {
      params,
      requestOptions,
    });
  }

  /**
   * POST /numbers/orders — order one number for the workspace.
   *
   * **This spends money.** A number carries a recurring monthly charge (and
   * usually a one-off setup fee once live), and an order cannot be undone by
   * retrying: a repeat call orders a second number and a second charge. Use
   * `release()` to stop paying for a number. Never retried automatically,
   * whatever `maxRetries` is set to.
   *
   * A number served from nopaque's pool is live at once (`fromPool: true`, no
   * `orderId`). Otherwise it starts in state `ordering` and takes about a day
   * to activate; follow it with `getOrder(orderId)`.
   */
  async order(
    body: CreateNumberOrderRequest,
    requestOptions?: RequestOptions
  ): Promise<NumberOrderResponse> {
    // Never retried: a retry after a dropped connection could buy a second number.
    return await this.transport.request('POST', '/numbers/orders', {
      body,
      requestOptions: { ...requestOptions, maxRetries: 0 },
    });
  }

  /**
   * GET /numbers/orders/{orderId} — an order's progress, counted per
   * regulatory requirement. Read this rather than the number's state.
   */
  async getOrder(orderId: string, requestOptions?: RequestOptions): Promise<NumberOrder> {
    return await this.transport.request('GET', `/numbers/orders/${encodeURIComponent(orderId)}`, { requestOptions });
  }

  /**
   * PATCH /numbers/{numberId} — set a live number's use (a one-element
   * `uses` list), its `isDefault` flag, or both.
   */
  async update(
    numberId: string,
    body: UpdateNumberRequest,
    requestOptions?: RequestOptions
  ): Promise<PhoneNumber> {
    const raw = await this.transport.request<{ number: PhoneNumber }>(
      'PATCH', `/numbers/${encodeURIComponent(numberId)}`, { body, requestOptions }
    );
    return raw.number;
  }

  /**
   * POST /numbers/{numberId}/release — give a live number back. Billing for
   * it stops. The number returns to nopaque's pool and is not reserved for
   * you. `released: false` means the release started and finishes on its own.
   */
  async release(numberId: string, requestOptions?: RequestOptions): Promise<ReleaseNumberResponse> {
    return await this.transport.request('POST', `/numbers/${encodeURIComponent(numberId)}/release`, {
      requestOptions,
    });
  }
}
