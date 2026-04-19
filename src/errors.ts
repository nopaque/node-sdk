export class NopaqueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NopaqueConfigError extends NopaqueError {}

export class NopaqueTimeoutError extends NopaqueError {}

export class APIConnectionError extends NopaqueError {
  override cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export class APITimeoutError extends NopaqueError {}

export interface APIErrorInit {
  status: number;
  code?: string | null;
  message?: string;
  details?: unknown;
  requestId?: string | null;
  response?: Response | null;
}

export class NopaqueAPIError extends NopaqueError {
  status: number;
  code: string | null;
  details: unknown;
  requestId: string | null;
  response: Response | null;

  constructor(init: APIErrorInit) {
    super(init.message ?? `HTTP ${init.status}`);
    this.status = init.status;
    this.code = init.code ?? null;
    this.details = init.details ?? null;
    this.requestId = init.requestId ?? null;
    this.response = init.response ?? null;
  }
}

export class ValidationError extends NopaqueAPIError {}
export class AuthenticationError extends NopaqueAPIError {}
export class PermissionError extends NopaqueAPIError {}
export class NotFoundError extends NopaqueAPIError {}
export class ConflictError extends NopaqueAPIError {}
export class ServerError extends NopaqueAPIError {}

export class RateLimitError extends NopaqueAPIError {
  retryAfter: number | null;
  constructor(init: APIErrorInit & { retryAfter?: number | null }) {
    super(init);
    this.retryAfter = init.retryAfter ?? null;
  }
}

const STATUS_MAP: Record<number, typeof NopaqueAPIError> = {
  400: ValidationError,
  401: AuthenticationError,
  403: PermissionError,
  404: NotFoundError,
  409: ConflictError,
  429: RateLimitError,
};

export function classifyStatus(status: number): typeof NopaqueAPIError {
  const specific = STATUS_MAP[status];
  if (specific) return specific;
  if (status >= 500 && status < 600) return ServerError;
  return NopaqueAPIError;
}
