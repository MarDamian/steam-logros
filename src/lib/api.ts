import type {
  ApiErrorBody,
  ApiErrorCode,
  GameCatalog,
  GameProgressSummary,
  LibraryResponse,
  PlayerProgress,
  PlayerSummary,
  SteamLanguage,
} from '@shared/types';

export class ClientApiError extends Error {
  readonly code: ApiErrorCode | 'NETWORK';

  constructor(code: ApiErrorCode | 'NETWORK', message: string) {
    super(message);
    this.name = 'ClientApiError';
    this.code = code;
  }
}

async function request<T>(path: string, signal?: AbortSignal, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { accept: 'application/json' }, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ClientApiError('NETWORK', 'No se pudo contactar con el servidor.');
  }

  const text = await response.text();
  let body: unknown;
  try {
    body = text === '' ? null : (JSON.parse(text) as unknown);
  } catch {
    throw new ClientApiError('INTERNAL', 'El servidor respondió algo que no es JSON.');
  }

  if (!response.ok) {
    const parsed = body as Partial<ApiErrorBody> | null;
    const code = parsed?.error?.code ?? 'INTERNAL';
    throw new ClientApiError(code, parsed?.error?.message ?? `HTTP ${response.status}`);
  }
  return body as T;
}

export type SessionState =
  | { authenticated: false }
  | { authenticated: true; steamid: string; player: PlayerSummary | null };

export interface ServerConfig {
  mode: 'live' | 'mock';
  demoSteamId: string;
  defaultSteamLanguage: SteamLanguage;
  loginEnabled: boolean;
}

export const api = {
  config: (signal?: AbortSignal) => request<ServerConfig>('/api/config', signal),

  me: (signal?: AbortSignal) => request<SessionState>('/api/me', signal),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', undefined, { method: 'POST' }),

  /** Ruta a la que hay que navegar (no hacer fetch) para arrancar el login. */
  loginStartPath: '/api/auth/steam/start',

  resolve: (input: string, signal?: AbortSignal) =>
    request<{ steamid: string }>(`/api/resolve?input=${encodeURIComponent(input)}`, signal),

  player: (steamid: string, signal?: AbortSignal) => request<PlayerSummary>(`/api/player/${steamid}`, signal),

  library: (steamid: string, signal?: AbortSignal) => request<LibraryResponse>(`/api/library/${steamid}`, signal),

  libraryProgress: (steamid: string, appids: readonly number[], signal?: AbortSignal) =>
    request<{ steamid: string; progress: GameProgressSummary[] }>(
      `/api/library/${steamid}/progress?appids=${appids.join(',')}`,
      signal,
    ),

  catalog: (appid: number, language: SteamLanguage, signal?: AbortSignal) =>
    request<GameCatalog>(`/api/game/${appid}/catalog?lang=${language}`, signal),

  progress: (steamid: string, appid: number, signal?: AbortSignal) =>
    request<PlayerProgress>(`/api/progress/${steamid}/${appid}`, signal),
};

/** Juegos por lote en el endpoint de progreso. Debe coincidir con PROGRESS_BATCH_MAX del servidor. */
export const PROGRESS_BATCH_MAX = 12;
