import type {
  GameCatalog,
  GameProgressSummary,
  LibraryGame,
  PlayerProgress,
  PlayerSummary,
  SteamLanguage,
} from '../../shared/types';
import { TTL, type CacheStore } from '../cache';
import type { Env } from '../env';
import { ApiError } from '../errors';
import { parseSteam, steamFetch } from './http';
import {
  globalPercentagesResponse,
  ownedGamesResponse,
  playerAchievementsResponse,
  playerSummariesResponse,
  schemaForGameResponse,
  vanityUrlResponse,
} from './schemas';

export interface SteamApi {
  readonly mode: 'live' | 'mock';
  resolveVanity(vanity: string): Promise<string>;
  getPlayerSummary(steamid: string): Promise<PlayerSummary>;
  getOwnedGames(steamid: string): Promise<LibraryGame[]>;
  getGameCatalog(appid: number, language: SteamLanguage): Promise<GameCatalog>;
  getPlayerProgress(steamid: string, appid: number): Promise<PlayerProgress>;
  getProgressSummary(steamid: string, appid: number): Promise<GameProgressSummary>;
}

/** Envuelve una lectura con caché: si está, se devuelve; si no, se calcula y se guarda. */
export async function cached<T>(
  cache: CacheStore,
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await compute();
  await cache.set(key, value, ttlSeconds);
  return value;
}

export function createLiveSteamApi(env: Env, cache: CacheStore): SteamApi {
  const key = env.STEAM_API_KEY;
  if (!key) throw new ApiError('NO_API_KEY', 'Falta STEAM_API_KEY en el servidor.');

  const api: SteamApi = {
    mode: 'live',

    async resolveVanity(vanity) {
      return cached(cache, `vanity:${vanity.toLowerCase()}`, TTL.vanity, async () => {
        const raw = await steamFetch({ path: 'ISteamUser/ResolveVanityURL/v1', params: { vanityurl: vanity } }, key);
        const parsed = parseSteam(vanityUrlResponse, raw.body, 'ResolveVanityURL');
        if (parsed.response.success === 1 && 'steamid' in parsed.response) return parsed.response.steamid;
        throw new ApiError('PROFILE_NOT_FOUND', 'No existe un perfil con ese nombre de URL.');
      });
    },

    async getPlayerSummary(steamid) {
      return cached(cache, `player:${steamid}`, TTL.player, async () => {
        const raw = await steamFetch({ path: 'ISteamUser/GetPlayerSummaries/v2', params: { steamids: steamid } }, key);
        const parsed = parseSteam(playerSummariesResponse, raw.body, 'GetPlayerSummaries');
        const player = parsed.response.players[0];
        if (!player) throw new ApiError('PROFILE_NOT_FOUND', 'Steam no conoce ese SteamID.');
        return {
          steamid: player.steamid,
          personaName: player.personaname ?? player.steamid,
          avatar: player.avatarfull ?? player.avatarmedium ?? player.avatar ?? '',
          profileUrl: player.profileurl ?? `https://steamcommunity.com/profiles/${player.steamid}/`,
          isPublic: player.communityvisibilitystate === 3,
        } satisfies PlayerSummary;
      });
    },

    async getOwnedGames(steamid) {
      return cached(cache, `lib:${steamid}`, TTL.library, async () => {
        const raw = await steamFetch(
          {
            path: 'IPlayerService/GetOwnedGames/v1',
            params: { steamid, include_appinfo: 1, include_played_free_games: 1 },
          },
          key,
        );
        const parsed = parseSteam(ownedGamesResponse, raw.body, 'GetOwnedGames');
        const { games, game_count: gameCount } = parsed.response;
        if (!games) {
          // Steam devuelve {"response":{}} cuando "Detalles del juego" no es público.
          if (gameCount === 0) return [];
          throw new ApiError('PRIVATE_PROFILE', 'La biblioteca de este perfil no es pública.');
        }
        return games.map(
          (game): LibraryGame => ({
            appid: game.appid,
            name: game.name ?? `App ${game.appid}`,
            playtimeMinutes: game.playtime_forever ?? 0,
            iconUrl: game.img_icon_url
              ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
              : null,
            hasStats: game.has_community_visible_stats === true,
          }),
        );
      });
    },

    async getGameCatalog(appid, language) {
      return cached(cache, `cat:${appid}:${language}`, TTL.catalog, async () => {
        const [schemaRaw, percentages] = await Promise.all([
          steamFetch({ path: 'ISteamUserStats/GetSchemaForGame/v2', params: { appid, l: language } }, key),
          loadGlobalPercentages(cache, appid),
        ]);
        const schema = parseSteam(schemaForGameResponse, schemaRaw.body, 'GetSchemaForGame');
        const achievements = schema.game.availableGameStats?.achievements ?? [];
        if (achievements.length === 0) {
          throw new ApiError('NO_STATS', 'Este juego no tiene logros en Steam.');
        }
        return {
          appid,
          gameName: schema.game.gameName ?? `App ${appid}`,
          language,
          achievements: achievements.map((achievement) => ({
            apiName: achievement.name,
            displayName: achievement.displayName ?? achievement.name,
            description: achievement.description ?? '',
            hidden: achievement.hidden === 1,
            icon: achievement.icon ?? '',
            iconGray: achievement.icongray ?? achievement.icon ?? '',
            globalPercent: percentages.get(achievement.name) ?? null,
          })),
        } satisfies GameCatalog;
      });
    },

    async getPlayerProgress(steamid, appid) {
      return cached(cache, `prog:${steamid}:${appid}`, TTL.progress, async () => {
        const raw = await steamFetch(
          {
            path: 'ISteamUserStats/GetPlayerAchievements/v1',
            params: { steamid, appid },
            tolerateStatus: [400, 403],
          },
          key,
        );
        const parsed = parseSteam(playerAchievementsResponse, raw.body, 'GetPlayerAchievements');
        const stats = parsed.playerstats;
        if (stats.success === false || !stats.achievements) {
          throw errorForPlayerStats(stats.error);
        }
        const unlocked: Record<string, number> = {};
        for (const achievement of stats.achievements) {
          if (achievement.achieved === 1) unlocked[achievement.apiname] = achievement.unlocktime ?? 0;
        }
        return { steamid, appid, unlocked, total: stats.achievements.length } satisfies PlayerProgress;
      });
    },

    async getProgressSummary(steamid, appid) {
      return summaryFromProgress(api, steamid, appid);
    },
  };

  async function loadGlobalPercentages(store: CacheStore, appid: number): Promise<Map<string, number>> {
    const entries = await cached(store, `global:${appid}`, TTL.globalPercentages, async () => {
      try {
        // Este endpoint no necesita clave.
        const raw = await steamFetch({
          path: 'ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2',
          params: { gameid: appid },
          tolerateStatus: [400, 403],
        });
        const parsed = parseSteam(globalPercentagesResponse, raw.body, 'GetGlobalAchievementPercentagesForApp');
        return parsed.achievementpercentages.achievements.map((a) => [a.name, a.percent] as const);
      } catch {
        // Sin porcentajes la app sigue funcionando: solo no hay rareza.
        return [];
      }
    });
    return new Map(entries);
  }

  return api;
}

/** Traduce el texto de error de GetPlayerAchievements a un código nuestro. */
export function errorForPlayerStats(error: string | undefined): ApiError {
  const message = (error ?? '').toLowerCase();
  if (message.includes('not public') || message.includes('private')) {
    return new ApiError('PRIVATE_PROFILE', 'El perfil no tiene públicos los detalles del juego.');
  }
  if (message.includes('no stats') || message.includes('no achievements')) {
    return new ApiError('NO_STATS', 'Este juego no tiene logros en Steam.');
  }
  return new ApiError('STEAM_UNAVAILABLE', error ?? 'Steam no devolvió los logros.');
}

/** Resumen para las tarjetas de la biblioteca: los errores esperables no cortan la lista. */
export async function summaryFromProgress(
  api: SteamApi,
  steamid: string,
  appid: number,
): Promise<GameProgressSummary> {
  try {
    const progress = await api.getPlayerProgress(steamid, appid);
    return { appid, total: progress.total, unlocked: Object.keys(progress.unlocked).length };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'NO_STATS' || error.code === 'PRIVATE_PROFILE') {
        return { appid, total: 0, unlocked: 0, unavailable: error.code };
      }
      if (error.code === 'STEAM_UNAVAILABLE' || error.code === 'RATE_LIMITED') {
        return { appid, total: 0, unlocked: 0, unavailable: 'STEAM_UNAVAILABLE' };
      }
    }
    throw error;
  }
}
