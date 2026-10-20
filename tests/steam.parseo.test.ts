import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryCache } from '../server/cache';
import { createLiveSteamApi, errorForPlayerStats } from '../server/steam/api';
import {
  globalPercentagesResponse,
  ownedGamesResponse,
  playerAchievementsResponse,
  playerSummariesResponse,
  schemaForGameResponse,
  vanityUrlResponse,
} from '../server/steam/schemas';
import { ApiError } from '../server/errors';

import achievements2358720 from '../server/steam/fixtures/achievements-2358720.json' with { type: 'json' };
import achievementsNostats from '../server/steam/fixtures/achievements-nostats.json' with { type: 'json' };
import achievementsPrivate from '../server/steam/fixtures/achievements-private.json' with { type: 'json' };
import global2358720 from '../server/steam/fixtures/global-2358720.json' with { type: 'json' };
import ownedGames from '../server/steam/fixtures/owned-games.json' with { type: 'json' };
import ownedGamesPrivate from '../server/steam/fixtures/owned-games-private.json' with { type: 'json' };
import playerSummaries from '../server/steam/fixtures/player-summaries.json' with { type: 'json' };
import schemaSpanish from '../server/steam/fixtures/schema-2358720-spanish.json' with { type: 'json' };
import vanityFound from '../server/steam/fixtures/vanity-found.json' with { type: 'json' };
import vanityNotFound from '../server/steam/fixtures/vanity-notfound.json' with { type: 'json' };

const CLAVE = 'clave-de-steam-que-no-debe-aparecer-nunca';

describe('esquemas contra las respuestas reales de Steam', () => {
  it('parsea todos los fixtures', () => {
    expect(vanityUrlResponse.safeParse(vanityFound).success).toBe(true);
    expect(vanityUrlResponse.safeParse(vanityNotFound).success).toBe(true);
    expect(playerSummariesResponse.safeParse(playerSummaries).success).toBe(true);
    expect(ownedGamesResponse.safeParse(ownedGames).success).toBe(true);
    expect(ownedGamesResponse.safeParse(ownedGamesPrivate).success).toBe(true);
    expect(playerAchievementsResponse.safeParse(achievements2358720).success).toBe(true);
    expect(playerAchievementsResponse.safeParse(achievementsPrivate).success).toBe(true);
    expect(playerAchievementsResponse.safeParse(achievementsNostats).success).toBe(true);
    expect(schemaForGameResponse.safeParse(schemaSpanish).success).toBe(true);
    expect(globalPercentagesResponse.safeParse(global2358720).success).toBe(true);
  });

  it('acepta el porcentaje global como texto y como número', () => {
    const comoTexto = globalPercentagesResponse.parse({
      achievementpercentages: { achievements: [{ name: 'A', percent: '97.7' }] },
    });
    const comoNumero = globalPercentagesResponse.parse({
      achievementpercentages: { achievements: [{ name: 'A', percent: 97.7 }] },
    });
    expect(comoTexto.achievementpercentages.achievements[0]?.percent).toBe(97.7);
    expect(comoNumero.achievementpercentages.achievements[0]?.percent).toBe(97.7);
  });

  it('tolera los campos que Steam a veces no manda', () => {
    const parsed = schemaForGameResponse.parse({
      game: { availableGameStats: { achievements: [{ name: 'SOLO_NOMBRE' }] } },
    });
    expect(parsed.game.availableGameStats?.achievements?.[0]?.name).toBe('SOLO_NOMBRE');
    expect(playerSummariesResponse.parse({ response: { players: [{ steamid: '76561198000000001' }] } }).response.players).toHaveLength(1);
  });

  it('rechaza lo que no tiene la forma esperada', () => {
    expect(ownedGamesResponse.safeParse({ response: { games: [{ appid: 'no-soy-un-numero' }] } }).success).toBe(false);
    expect(playerSummariesResponse.safeParse({ response: {} }).success).toBe(false);
    expect(globalPercentagesResponse.safeParse({ achievementpercentages: {} }).success).toBe(false);
    expect(playerAchievementsResponse.safeParse({}).success).toBe(false);
  });
});

describe('errorForPlayerStats', () => {
  it('traduce los textos de error de Steam a códigos nuestros', () => {
    expect(errorForPlayerStats('Profile is not public').code).toBe('PRIVATE_PROFILE');
    expect(errorForPlayerStats('Requested app has no stats').code).toBe('NO_STATS');
    expect(errorForPlayerStats('cualquier otra cosa').code).toBe('STEAM_UNAVAILABLE');
    expect(errorForPlayerStats(undefined).code).toBe('STEAM_UNAVAILABLE');
  });
});

describe('cliente de Steam contra respuestas simuladas', () => {
  let llamadas: string[];

  function responder(respuestas: Record<string, { body: unknown; status?: number }>): void {
    llamadas = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      llamadas.push(url);
      const match = Object.entries(respuestas).find(([ruta]) => url.includes(ruta));
      if (!match) return new Response('no esperaba esta llamada', { status: 500 });
      const [, { body, status }] = match;
      return new Response(JSON.stringify(body), { status: status ?? 200 });
    });
  }

  function api() {
    return createLiveSteamApi({ STEAM_API_KEY: CLAVE }, new MemoryCache());
  }

  beforeEach(() => {
    llamadas = [];
  });

  it('resuelve una URL personalizada y la cachea', async () => {
    responder({ ResolveVanityURL: { body: vanityFound } });
    const steam = api();
    expect(await steam.resolveVanity('perfil-demo')).toBe('76561198000000001');
    await steam.resolveVanity('perfil-demo');
    // La segunda vez sale de la caché: una sola llamada a Steam.
    expect(llamadas).toHaveLength(1);
  });

  it('una URL personalizada inexistente es PROFILE_NOT_FOUND', async () => {
    responder({ ResolveVanityURL: { body: vanityNotFound } });
    await expect(api().resolveVanity('no-existe')).rejects.toMatchObject({ code: 'PROFILE_NOT_FOUND' });
  });

  it('la biblioteca vacía de un perfil privado es PRIVATE_PROFILE', async () => {
    responder({ GetOwnedGames: { body: ownedGamesPrivate } });
    await expect(api().getOwnedGames('76561198000000002')).rejects.toMatchObject({ code: 'PRIVATE_PROFILE' });
  });

  it('una biblioteca pública pero sin juegos no es un error', async () => {
    responder({ GetOwnedGames: { body: { response: { game_count: 0 } } } });
    await expect(api().getOwnedGames('76561198000000001')).resolves.toEqual([]);
  });

  it('une el esquema con los porcentajes globales', async () => {
    responder({
      GetSchemaForGame: { body: schemaSpanish },
      GetGlobalAchievementPercentagesForApp: { body: global2358720 },
    });
    const catalog = await api().getGameCatalog(2358720, 'spanish');
    expect(catalog.achievements).toHaveLength(81);
    expect(catalog.achievements[0]).toMatchObject({ apiName: '81001', globalPercent: 97.7 });
    expect(catalog.achievements.filter((a) => a.hidden)).toHaveLength(62);
  });

  it('sin porcentajes globales el catálogo sigue saliendo, sin rareza', async () => {
    responder({
      GetSchemaForGame: { body: schemaSpanish },
      GetGlobalAchievementPercentagesForApp: { body: {}, status: 403 },
    });
    const catalog = await api().getGameCatalog(2358720, 'spanish');
    expect(catalog.achievements).toHaveLength(81);
    expect(catalog.achievements.every((a) => a.globalPercent === null)).toBe(true);
  });

  it('un juego sin logros en el esquema es NO_STATS', async () => {
    responder({
      GetSchemaForGame: { body: { game: { gameName: 'Sin logros' } } },
      GetGlobalAchievementPercentagesForApp: { body: { achievementpercentages: { achievements: [] } } },
    });
    await expect(api().getGameCatalog(431960, 'spanish')).rejects.toMatchObject({ code: 'NO_STATS' });
  });

  it('el progreso cuenta solo los desbloqueados y guarda la fecha', async () => {
    responder({ GetPlayerAchievements: { body: achievements2358720 } });
    const progress = await api().getPlayerProgress('76561198000000001', 2358720);
    expect(progress.total).toBe(81);
    expect(Object.keys(progress.unlocked)).toHaveLength(32);
    expect(progress.unlocked['81001']).toBeGreaterThan(0);
  });

  it('el perfil privado en el progreso es PRIVATE_PROFILE, aunque Steam conteste 403', async () => {
    responder({ GetPlayerAchievements: { body: achievementsPrivate, status: 403 } });
    await expect(api().getPlayerProgress('76561198000000002', 2358720)).rejects.toMatchObject({
      code: 'PRIVATE_PROFILE',
    });
  });

  it('un juego sin estadísticas en el progreso es NO_STATS', async () => {
    responder({ GetPlayerAchievements: { body: achievementsNostats, status: 400 } });
    await expect(api().getPlayerProgress('76561198000000001', 431960)).rejects.toMatchObject({ code: 'NO_STATS' });
  });

  it('una respuesta que no es JSON no se hace pasar por datos', async () => {
    globalThis.fetch = vi.fn(async () => new Response('<html>mantenimiento</html>', { status: 200 }));
    await expect(api().getPlayerSummary('76561198000000001')).rejects.toMatchObject({
      code: 'STEAM_UNAVAILABLE',
    });
  });

  it('manda la clave a Steam pero nunca la filtra en un error', async () => {
    responder({ GetPlayerSummaries: { body: { esto: 'no es lo que esperamos' } } });
    const error = await api()
      .getPlayerSummary('76561198000000001')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).not.toContain(CLAVE);
    expect(JSON.stringify((error as ApiError).toBody())).not.toContain(CLAVE);
    // Y sí fue a Steam con la clave puesta.
    expect(llamadas[0]).toContain(`key=${CLAVE}`);
  });

  it('sin clave el cliente no se construye', () => {
    expect(() => createLiveSteamApi({}, new MemoryCache())).toThrowError(/STEAM_API_KEY/);
  });
});
