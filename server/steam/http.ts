import type { z } from 'zod';
import { ApiError } from '../errors';

const STEAM_API_BASE = 'https://api.steampowered.com';
const TIMEOUT_MS = 10_000;

export interface SteamRequest {
  /** Ruta dentro de api.steampowered.com, p. ej. ISteamUser/GetPlayerSummaries/v2 */
  path: string;
  params: Record<string, string | number | undefined>;
  /** Respuestas de Steam que no son errores nuestros (perfil privado, sin logros...). */
  tolerateStatus?: number[];
}

export interface SteamRawResult {
  status: number;
  body: unknown;
}

/**
 * Única puerta de salida hacia Steam. La clave se añade acá y nunca se
 * incluye en mensajes de error ni en logs.
 */
export async function steamFetch(request: SteamRequest, apiKey?: string): Promise<SteamRawResult> {
  const url = new URL(`${STEAM_API_BASE}/${request.path.replace(/^\/+/, '')}/`);
  for (const [key, value] of Object.entries(request.params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  if (apiKey) url.searchParams.set('key', apiKey);

  const tolerated = new Set(request.tolerateStatus ?? []);
  let lastStatus = 0;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Timeout o fallo de red: un reintento y listo.
      lastStatus = 0;
      if (attempt === 0) {
        await delay(400);
        continue;
      }
      throw new ApiError('STEAM_UNAVAILABLE', 'No se pudo contactar con Steam.');
    }

    lastStatus = response.status;
    if (response.ok || tolerated.has(response.status)) {
      const text = await response.text();
      if (text.trim() === '') return { status: response.status, body: {} };
      try {
        return { status: response.status, body: JSON.parse(text) as unknown };
      } catch {
        throw new ApiError('STEAM_UNAVAILABLE', 'Steam respondió algo que no es JSON.');
      }
    }

    if (response.status === 401 || response.status === 403) {
      throw new ApiError('PRIVATE_PROFILE', 'Steam rechazó la consulta: el perfil no es público.');
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === 0) {
        await delay(600);
        continue;
      }
      throw new ApiError(
        response.status === 429 ? 'RATE_LIMITED' : 'STEAM_UNAVAILABLE',
        `Steam devolvió ${response.status} en ${request.path}.`,
      );
    }
    throw new ApiError('STEAM_UNAVAILABLE', `Steam devolvió ${response.status} en ${request.path}.`);
  }

  throw new ApiError('STEAM_UNAVAILABLE', `Steam devolvió ${lastStatus} en ${request.path}.`);
}

export function parseSteam<T extends z.ZodTypeAny>(schema: T, body: unknown, where: string): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError('STEAM_UNAVAILABLE', `Respuesta inesperada de Steam en ${where}.`);
  }
  return result.data;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
