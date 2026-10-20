import type { CacheStore } from '../cache';
import type { Env } from '../env';
import { isMockMode } from '../env';
import { createLiveSteamApi, type SteamApi } from './api';
import { createMockSteamApi } from './mock';

export type { SteamApi } from './api';
export { MOCK_STEAMID, MOCK_PRIVATE_STEAMID, MOCK_VANITY } from './mock';

export function createSteamApi(env: Env, cache: CacheStore): SteamApi {
  return isMockMode(env) ? createMockSteamApi() : createLiveSteamApi(env, cache);
}
