import type { ApiErrorBody, ApiErrorCode } from '../shared/types';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  PRIVATE_PROFILE: 403,
  PROFILE_NOT_FOUND: 404,
  NO_STATS: 404,
  NO_API_KEY: 503,
  RATE_LIMITED: 429,
  STEAM_UNAVAILABLE: 502,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message } };
  }
}

export function statusForCode(code: ApiErrorCode): number {
  return STATUS_BY_CODE[code];
}
