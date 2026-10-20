import type { ApiErrorCode } from '@shared/types';
import { ClientApiError } from './api';
import type { MessageKey } from '@/i18n/es';

export const ERROR_MESSAGE_KEYS: Record<ApiErrorCode | 'NETWORK', MessageKey> = {
  BAD_REQUEST: 'errors.BAD_REQUEST',
  PRIVATE_PROFILE: 'errors.PRIVATE_PROFILE',
  PROFILE_NOT_FOUND: 'errors.PROFILE_NOT_FOUND',
  NO_STATS: 'errors.NO_STATS',
  NO_API_KEY: 'errors.NO_API_KEY',
  RATE_LIMITED: 'errors.RATE_LIMITED',
  STEAM_UNAVAILABLE: 'errors.STEAM_UNAVAILABLE',
  INTERNAL: 'errors.INTERNAL',
  NETWORK: 'errors.network',
};

export function errorCodeOf(error: unknown): ApiErrorCode | 'NETWORK' {
  return error instanceof ClientApiError ? error.code : 'INTERNAL';
}
