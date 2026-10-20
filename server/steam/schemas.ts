import { z } from 'zod';

/**
 * Formas de respuesta de la Web API de Steam, según la documentación oficial
 * (https://developer.valvesoftware.com/wiki/Steam_Web_API) y lo que devuelve en
 * la práctica. Todo campo que Steam omite a veces va como .optional().
 *
 * Steam no promete tipos estables: los porcentajes globales llegan como string
 * en unas respuestas y como número en otras, de ahí los z.coerce.
 */

export const vanityUrlResponse = z.object({
  response: z.union([
    z.object({ success: z.literal(1), steamid: z.string() }),
    z.object({ success: z.number(), message: z.string().optional() }),
  ]),
});

export const playerSummariesResponse = z.object({
  response: z.object({
    players: z.array(
      z.object({
        steamid: z.string(),
        personaname: z.string().optional(),
        profileurl: z.string().optional(),
        avatar: z.string().optional(),
        avatarmedium: z.string().optional(),
        avatarfull: z.string().optional(),
        /** 1 = privado / solo amigos, 3 = público. */
        communityvisibilitystate: z.number().optional(),
        profilestate: z.number().optional(),
      }),
    ),
  }),
});

export const ownedGamesResponse = z.object({
  response: z.object({
    game_count: z.number().optional(),
    games: z
      .array(
        z.object({
          appid: z.number(),
          name: z.string().optional(),
          playtime_forever: z.number().optional(),
          img_icon_url: z.string().optional(),
          has_community_visible_stats: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
});

export const playerAchievementsResponse = z.object({
  playerstats: z.object({
    steamID: z.string().optional(),
    gameName: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    achievements: z
      .array(
        z.object({
          apiname: z.string(),
          achieved: z.coerce.number(),
          unlocktime: z.coerce.number().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

export const schemaForGameResponse = z.object({
  game: z.object({
    gameName: z.string().optional(),
    gameVersion: z.string().optional(),
    availableGameStats: z
      .object({
        achievements: z
          .array(
            z.object({
              name: z.string(),
              defaultvalue: z.number().optional(),
              displayName: z.string().optional(),
              /** 1 cuando Steam oculta la descripción hasta desbloquearlo. */
              hidden: z.coerce.number().optional(),
              description: z.string().optional(),
              icon: z.string().optional(),
              icongray: z.string().optional(),
            }),
          )
          .optional(),
      })
      .optional(),
  }),
});

export const globalPercentagesResponse = z.object({
  achievementpercentages: z.object({
    achievements: z.array(
      z.object({
        name: z.string(),
        percent: z.coerce.number(),
      }),
    ),
  }),
});

export type VanityUrlResponse = z.infer<typeof vanityUrlResponse>;
export type PlayerSummariesResponse = z.infer<typeof playerSummariesResponse>;
export type OwnedGamesResponse = z.infer<typeof ownedGamesResponse>;
export type PlayerAchievementsResponse = z.infer<typeof playerAchievementsResponse>;
export type SchemaForGameResponse = z.infer<typeof schemaForGameResponse>;
export type GlobalPercentagesResponse = z.infer<typeof globalPercentagesResponse>;
