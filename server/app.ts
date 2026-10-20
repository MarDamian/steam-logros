import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiErrorCode, GameProgressSummary, SteamLanguage } from '../shared/types';
import { STEAMID64_RE } from '../shared/steamid';
import { parseProfileInput } from '../shared/steamid';
import { getCache } from './cache';
import { defaultLanguage, demoSteamId, isMockMode, readEnv, type Env } from './env';
import { ApiError } from './errors';
import { mapWithLimit } from './concurrency';
import { clientIp, enforceRateLimit } from './ratelimit';
import { createSteamApi, MOCK_STEAMID } from './steam';

/** Como máximo 4 llamadas simultáneas a Steam por petición nuestra. */
const PROGRESS_CONCURRENCY = 4;
/** Y como máximo 12 juegos por lote, para que la petición no se eternice. */
const PROGRESS_BATCH_MAX = 12;

type AppBindings = { Bindings: Env };

const steamidSchema = z.string().regex(STEAMID64_RE, 'SteamID64 inválido');
const appidSchema = z.coerce.number().int().positive().max(99_999_999);
const languageSchema = z.enum(['spanish', 'english']);

export function createApp() {
  const app = new Hono<AppBindings>();

  app.use('*', async (c, next) => {
    await next();
    c.header('x-content-type-options', 'nosniff');
    c.header('referrer-policy', 'no-referrer');
  });

  // Limitador por IP para todo /api.
  app.use('/api/*', async (c, next) => {
    const env = readEnv(c.env);
    await enforceRateLimit(getCache(env), clientIp(c.req.raw.headers));
    await next();
  });

  app.get('/api/config', (c) => {
    const env = readEnv(c.env);
    return c.json({
      mode: isMockMode(env) ? ('mock' as const) : ('live' as const),
      // En modo fixtures el único perfil que existe es el de ejemplo.
      demoSteamId: isMockMode(env) ? MOCK_STEAMID : demoSteamId(env),
      defaultSteamLanguage: defaultLanguage(env),
      /** El login de Steam llega en la fase 2. */
      loginEnabled: false,
    });
  });

  app.get('/api/resolve', async (c) => {
    const env = readEnv(c.env);
    const input = c.req.query('input') ?? '';
    const parsed = parseProfileInput(input);
    if (parsed.kind === 'invalid') {
      throw new ApiError('BAD_REQUEST', 'Pegá un SteamID64 de 17 dígitos o una URL de perfil de Steam.');
    }
    if (parsed.kind === 'steamid64') return c.json({ steamid: parsed.value });

    const steam = createSteamApi(env, getCache(env));
    const steamid = await steam.resolveVanity(parsed.value);
    return c.json({ steamid });
  });

  app.get('/api/player/:steamid', async (c) => {
    const env = readEnv(c.env);
    const steamid = parseOrThrow(steamidSchema, c.req.param('steamid'));
    const steam = createSteamApi(env, getCache(env));
    return c.json(await steam.getPlayerSummary(steamid));
  });

  app.get('/api/library/:steamid', async (c) => {
    const env = readEnv(c.env);
    const steamid = parseOrThrow(steamidSchema, c.req.param('steamid'));
    const steam = createSteamApi(env, getCache(env));
    const games = await steam.getOwnedGames(steamid);
    return c.json({ steamid, games });
  });

  /** Progreso de varios juegos a la vez: lo que pide la carga perezosa de la biblioteca. */
  app.get('/api/library/:steamid/progress', async (c) => {
    const env = readEnv(c.env);
    const steamid = parseOrThrow(steamidSchema, c.req.param('steamid'));
    const appids = parseAppidList(c.req.query('appids'));
    const steam = createSteamApi(env, getCache(env));
    const progress = await mapWithLimit(appids, PROGRESS_CONCURRENCY, (appid) =>
      steam.getProgressSummary(steamid, appid),
    );
    return c.json({ steamid, progress } satisfies { steamid: string; progress: GameProgressSummary[] });
  });

  app.get('/api/game/:appid/catalog', async (c) => {
    const env = readEnv(c.env);
    const appid = parseOrThrow(appidSchema, c.req.param('appid'));
    const language = resolveLanguage(c.req.query('lang'), env);
    const steam = createSteamApi(env, getCache(env));
    const catalog = await steam.getGameCatalog(appid, language);
    // El catálogo no depende de quién pregunta: se puede cachear en el borde.
    c.header('cache-control', 'public, max-age=1800');
    return c.json(catalog);
  });

  app.get('/api/progress/:steamid/:appid', async (c) => {
    const env = readEnv(c.env);
    const steamid = parseOrThrow(steamidSchema, c.req.param('steamid'));
    const appid = parseOrThrow(appidSchema, c.req.param('appid'));
    const steam = createSteamApi(env, getCache(env));
    c.header('cache-control', 'private, max-age=60');
    return c.json(await steam.getPlayerProgress(steamid, appid));
  });

  // Nada de proxy abierto: cualquier otra ruta /api no existe.
  app.all('/api/*', (c) => c.json({ error: { code: 'BAD_REQUEST', message: 'Endpoint inexistente.' } }, 404));

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json(error.toBody(), error.status as never);
    }
    const code: ApiErrorCode = 'INTERNAL';
    return c.json({ error: { code, message: 'Error interno.' } }, 500);
  });

  return app;
}

function parseOrThrow<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError('BAD_REQUEST', result.error.issues[0]?.message ?? 'Parámetro inválido.');
  }
  return result.data;
}

function parseAppidList(raw: string | undefined): number[] {
  const parts = (raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  if (parts.length === 0) throw new ApiError('BAD_REQUEST', 'Falta el parámetro appids.');
  if (parts.length > PROGRESS_BATCH_MAX) {
    throw new ApiError('BAD_REQUEST', `Como máximo ${PROGRESS_BATCH_MAX} appids por petición.`);
  }
  const appids = parts.map((part) => parseOrThrow(appidSchema, part));
  return [...new Set(appids)];
}

function resolveLanguage(raw: string | undefined, env: Env): SteamLanguage {
  if (raw === undefined) return defaultLanguage(env);
  const result = languageSchema.safeParse(raw);
  return result.success ? result.data : defaultLanguage(env);
}
