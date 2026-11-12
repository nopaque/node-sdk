/** What a number was bought for. */
export type NumberPurpose = 'outbound' | 'inbound' | 'callback' | 'survey';

/** What a number is used for now. `outbound` and `load` are caller IDs; the rest are destinations. */
export type NumberUse = 'outbound' | 'load' | 'callback' | 'survey' | 'inbound';

export type PhoneNumberType = 'local' | 'mobile' | 'national' | 'shared_cost' | 'toll_free';

export type PhoneNumberState =
  | 'ordering'
  | 'live'
  | 'releasing'
  | 'pooled'
  | 'platform'
  | 'deleted'
  | 'failed';

export type NumberRequirementsStatus =
  | 'pending'
  | 'approved'
  | 'cancelled'
  | 'deleted'
  | 'requirement-info-exception'
  | 'requirement-info-pending'
  | 'requirement-info-under-review';

/** A number the workspace rents. */
export interface PhoneNumber {
  numberId: string;
  /** The order this number came from, when it came from one. */
  orderId?: string;
  /** The number, in E.164. */
  e164: string;
  countryIso2: string;
  phoneNumberType: PhoneNumberType;
  capabilities: Array<'voice' | 'sms' | 'mms' | 'fax' | 'local_calling' | 'emergency'>;
  /** What the number was bought for. What it may be used for now is `uses`. */
  type: NumberPurpose;
  uses?: NumberUse[];
  /** The workspace's default caller ID. At most one per workspace. */
  isDefault?: boolean;
  state: PhoneNumberState;
  /** Present while the number is being activated. */
  requirementsStatus?: NumberRequirementsStatus;
  monthlyRateUsd?: number;
  acquiredAt?: string;
  failedAt?: string;
  createdAt: string;
}

/** How many numbers this workspace may hold. Advisory: ordering enforces it. */
export interface NumberAllowance {
  used: number;
  /** Null when unlimited. */
  max?: number | null;
  /** Null when unlimited. */
  remaining?: number | null;
  unlimited: boolean;
  source: 'tier' | 'workspace_override' | 'deal';
  tier: string;
  includedInDeal?: boolean;
  dealRef?: string;
}

export interface ListNumbersResponse {
  numbers: PhoneNumber[];
  /** Absent if the allowance could not be read. */
  allowance?: NumberAllowance;
}

export interface AvailableNumbersParams {
  /** ISO-3166-1 alpha-2. */
  country: string;
  /** Omit to search every type that can do the job, cheapest first. */
  phoneNumberType?: string;
  /** What the number will be used for. Defaults to `survey`. */
  numberType?: NumberPurpose;
  /** 1-50, default 10. */
  limit?: number;
}

export interface AvailableNumber {
  e164: string;
  /** `true` for a number nopaque already holds: no setup fee, works immediately. */
  fromPool: boolean;
  phoneNumberType: string;
  capabilities: string[];
  monthlyRateUsd: number;
  /** The one-off setup fee, billed once the number is live. */
  upfrontRateUsd: number;
  /** `false` for numbers sold through sales only. */
  selfServe: boolean;
  currency: string;
  immediateActivation: boolean;
}

export interface AvailableNumbersResponse {
  country: string;
  phoneNumberType: string;
  /** Every type actually searched. */
  phoneNumberTypes?: string[];
  numberType: string;
  numbers: AvailableNumber[];
}

export interface NumberRequirementsParams {
  /** ISO-3166-1 alpha-2. Case-insensitive. */
  country: string;
  /** Defaults to the country's only offering when it has exactly one. */
  phoneNumberType?: string;
}

/** A regulatory item. Always satisfied by nopaque; this is information, not a form. */
export interface NumberRequirement {
  id: string;
  name: string;
  fieldType: 'document' | 'address' | 'textual';
  /** The carrier's own guidance, verbatim. */
  description?: string;
  acceptanceCriteria?: Record<string, unknown>;
  satisfiedBy: 'nopaque';
}

export interface NumberRequirementsResponse {
  country: string;
  phoneNumberType: string;
  requirements: NumberRequirement[];
}

export interface CreateNumberOrderRequest {
  /** The number to buy, exactly as `numbers.listAvailable()` returned it. */
  e164: string;
  numberType: NumberPurpose;
  /** ISO-3166-1 alpha-2. Only `GB` is sold today. */
  country: string;
  phoneNumberType?: 'national' | 'local' | 'mobile';
}

/**
 * The result of an order. `fromPool: true` (HTTP 201) means the number is live
 * now and there is no `orderId`; otherwise (HTTP 202) the number is in state
 * `ordering` and `orderId` tracks it.
 */
export interface NumberOrderResponse {
  number: PhoneNumber;
  orderId?: string;
  fromPool?: boolean;
  activation: { immediate?: boolean; message?: string };
  requirementsSubmitted?: boolean;
  premiumChargedUsd?: number;
  upfrontChargedUsd?: number;
  monthlyRateUsd?: number;
}

export interface NumberOrderProgress {
  complete: boolean;
  requirementsStatus?: NumberRequirementsStatus;
  total: number;
  approved: number;
  /** How many requirements are not approved yet. */
  awaitingOn: number;
  outstanding: Array<{
    requirementId?: string;
    name?: string;
    fieldType?: string;
    status?: string;
  }>;
  waitingOn: 'nopaque' | 'telnyx' | 'nobody';
  /** Always false. */
  customerMustAct?: boolean;
  deadline?: string;
}

export interface NumberOrder {
  orderId: string;
  number: PhoneNumber;
  progress: NumberOrderProgress;
}

/** Send at least one field. `uses` is a one-element list. */
export interface UpdateNumberRequest {
  uses?: [NumberUse];
  isDefault?: boolean;
}

export interface ReleaseNumberResponse {
  /** `false` with HTTP 202 means the release started and finishes on its own. */
  released: boolean;
  message?: string;
}
