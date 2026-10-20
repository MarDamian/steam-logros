/**
 * Modo sin clave: responde con fixtures locales en vez de llamar a Steam.
 * Sirve para desarrollar, para las pruebas y para que el modo demo funcione
 * en una instalación recién desplegada que todavía no tiene STEAM_API_KEY.
 *
 * Pasa los fixtures por los mismos esquemas de Zod que las respuestas reales,
 * así el modo demo ejercita el mismo código de parseo.
 */
import type {
  GameCatalog,
  GameProgressSummary,
  LibraryGame,
  PlayerProgress,
  PlayerSummary,
  SteamLanguage,
} from '../../shared/types';
import { ApiError } from '../errors';
import { parseSteam } from './http';
import {
  globalPercentagesResponse,
  ownedGamesResponse,
  playerAchievementsResponse,
  playerSummariesResponse,
  schemaForGameResponse,
} from './schemas';
import { summaryFromProgress, type SteamApi } from './api';

import achievementsWukong from './fixtures/achievements-2358720.json' with { type: 'json' };
import globalWukong from './fixtures/global-2358720.json' with { type: 'json' };
import ownedGames from './fixtures/owned-games.json' with { type: 'json' };
import playerSummaries from './fixtures/player-summaries.json' with { type: 'json' };
import playerSummariesPrivate from './fixtures/player-summaries-private.json' with { type: 'json' };
import schemaWukongEn from './fixtures/schema-2358720-english.json' with { type: 'json' };
import schemaWukongEs from './fixtures/schema-2358720-spanish.json' with { type: 'json' };

export const MOCK_STEAMID = '76561198000000001';
export const MOCK_PRIVATE_STEAMID = '76561198000000002';
export const MOCK_VANITY = 'perfil-demo';
const WUKONG_APPID = 2358720;

export function createMockSteamApi(): SteamApi {
  const api: SteamApi = {
    mode: 'mock',

    async resolveVanity(vanity) {
      if (vanity.toLowerCase() === MOCK_VANITY) return MOCK_STEAMID;
      if (vanity.toLowerCase() === 'perfil-privado') return MOCK_PRIVATE_STEAMID;
      throw new ApiError('PROFILE_NOT_FOUND', 'No existe un perfil con ese nombre de URL.');
    },

    async getPlayerSummary(steamid) {
      const fixture =
        steamid === MOCK_PRIVATE_STEAMID
          ? parseSteam(playerSummariesResponse, playerSummariesPrivate, 'mock GetPlayerSummaries')
          : parseSteam(playerSummariesResponse, playerSummaries, 'mock GetPlayerSummaries');
      const player = fixture.response.players[0];
      if (!player) throw new ApiError('PROFILE_NOT_FOUND', 'Fixture sin jugadores.');
      return {
        steamid,
        personaName: player.personaname ?? steamid,
        avatar: player.avatarfull ?? '',
        profileUrl: player.profileurl ?? `https://steamcommunity.com/profiles/${steamid}/`,
        isPublic: player.communityvisibilitystate === 3,
      } satisfies PlayerSummary;
    },

    async getOwnedGames(steamid) {
      if (steamid === MOCK_PRIVATE_STEAMID) {
        throw new ApiError('PRIVATE_PROFILE', 'La biblioteca de este perfil no es pública.');
      }
      const fixture = parseSteam(ownedGamesResponse, ownedGames, 'mock GetOwnedGames');
      return (fixture.response.games ?? []).map(
        (game): LibraryGame => ({
          appid: game.appid,
          name: game.name ?? `App ${game.appid}`,
          playtimeMinutes: game.playtime_forever ?? 0,
          iconUrl: null,
          hasStats: game.has_community_visible_stats === true,
        }),
      );
    },

    async getGameCatalog(appid, language) {
      if (appid === WUKONG_APPID) return wukongCatalog(language);
      if (!appHasStats(appid)) throw new ApiError('NO_STATS', 'Este juego no tiene logros en Steam.');
      return syntheticCatalog(appid, language);
    },

    async getPlayerProgress(steamid, appid) {
      if (steamid === MOCK_PRIVATE_STEAMID) {
        throw new ApiError('PRIVATE_PROFILE', 'El perfil no tiene públicos los detalles del juego.');
      }
      if (!appHasStats(appid)) throw new ApiError('NO_STATS', 'Este juego no tiene logros en Steam.');
      if (appid === WUKONG_APPID) {
        const fixture = parseSteam(playerAchievementsResponse, achievementsWukong, 'mock GetPlayerAchievements');
        const list = fixture.playerstats.achievements ?? [];
        const unlocked: Record<string, number> = {};
        for (const achievement of list) {
          if (achievement.achieved === 1) unlocked[achievement.apiname] = achievement.unlocktime ?? 0;
        }
        return { steamid, appid, unlocked, total: list.length } satisfies PlayerProgress;
      }
      const catalog = syntheticCatalog(appid, 'spanish');
      const unlocked: Record<string, number> = {};
      catalog.achievements.forEach((achievement, index) => {
        if (hash(`${steamid}:${appid}:${index}`) % 100 < 45) {
          unlocked[achievement.apiName] = 1720000000 + index * 7919;
        }
      });
      return { steamid, appid, unlocked, total: catalog.achievements.length } satisfies PlayerProgress;
    },

    async getProgressSummary(steamid, appid): Promise<GameProgressSummary> {
      return summaryFromProgress(api, steamid, appid);
    },
  };

  return api;
}

function appHasStats(appid: number): boolean {
  const fixture = parseSteam(ownedGamesResponse, ownedGames, 'mock GetOwnedGames');
  const game = (fixture.response.games ?? []).find((entry) => entry.appid === appid);
  // Un appid que no está en la biblioteca de ejemplo igual puede tener logros.
  return game ? game.has_community_visible_stats === true : true;
}

function wukongCatalog(language: SteamLanguage): GameCatalog {
  const source = language === 'english' ? schemaWukongEn : schemaWukongEs;
  const schema = parseSteam(schemaForGameResponse, source, 'mock GetSchemaForGame');
  const globals = parseSteam(globalPercentagesResponse, globalWukong, 'mock GetGlobalAchievementPercentagesForApp');
  const percentages = new Map(globals.achievementpercentages.achievements.map((a) => [a.name, a.percent]));
  const achievements = schema.game.availableGameStats?.achievements ?? [];
  return {
    appid: WUKONG_APPID,
    gameName: schema.game.gameName ?? 'Black Myth: Wukong',
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
  };
}

/** Catálogo inventado pero estable para los demás juegos de la biblioteca de ejemplo. */
function syntheticCatalog(appid: number, language: SteamLanguage): GameCatalog {
  const fixture = parseSteam(ownedGamesResponse, ownedGames, 'mock GetOwnedGames');
  const game = (fixture.response.games ?? []).find((entry) => entry.appid === appid);
  const gameName = game?.name ?? `App ${appid}`;
  const count = 8 + (hash(`count:${appid}`) % 45);
  const labels = language === 'english' ? { a: 'Achievement', h: 'Hidden achievement' } : { a: 'Logro', h: 'Logro oculto' };

  return {
    appid,
    gameName,
    language,
    achievements: Array.from({ length: count }, (_, index) => {
      const hidden = hash(`hidden:${appid}:${index}`) % 5 === 0;
      const percent = Math.round((99 - (index * 88) / Math.max(1, count - 1)) * 10) / 10;
      return {
        apiName: `MOCK_${appid}_${index + 1}`,
        displayName: `${labels.a} ${index + 1} · ${gameName}`,
        description: hidden ? '' : `${labels.h === 'Hidden achievement' ? 'Example data' : 'Datos de ejemplo'} (${gameName}).`,
        hidden,
        icon: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
        iconGray: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
        globalPercent: percent,
      };
    }),
  };
}

/** FNV-1a: hace falta que el mock sea determinista, no criptográfico. */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}
