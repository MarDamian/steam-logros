/**
 * Capa de guía por juego. Steam no sabe nada de capítulos, de logros que se
 * pueden perder ni de cómo conseguir cada cosa: eso es dato de comunidad y vive
 * en games/<appid>.json. Si el archivo no existe, el juego funciona igual con
 * los datos de Steam.
 *
 * El esquema de Zod de este archivo es la única fuente de verdad: de él sale
 * games/schema.json (para quien contribuya) y con él se validan los paquetes
 * tanto en el servidor como en el navegador.
 */
import { z } from 'zod';
import type { CatalogAchievement } from './types';

/**
 * - `historia`: se consigue avanzando, no hay forma de perderlo.
 * - `perdible`: se puede perder para siempre en esta partida si se avanza sin hacerlo.
 * - `cualquier-momento`: se puede conseguir cuando sea, incluso después del final.
 * - `ng+`: necesita una segunda vuelta (o una partida nueva).
 * - `sin-clasificar`: todavía nadie lo clasificó. Es un estado válido, no un error.
 */
export const ACHIEVEMENT_TYPES = ['historia', 'perdible', 'cualquier-momento', 'ng+', 'sin-clasificar'] as const;

export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];

const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'usá minúsculas, números y guiones');

const chapterSchema = z.object({
  id: idSchema,
  /** Para ordenar: 1, 2, 3… El número es el orden real en el juego. */
  order: z.number().int().min(0).max(999),
  name: z.string().min(1).max(200),
  note: z.string().max(1000).optional(),
});

const sourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().optional(),
});

const entrySchema = z.object({
  type: z.enum(ACHIEVEMENT_TYPES),
  /** id de un capítulo declarado en `chapters`. */
  chapter: idSchema.optional(),
  /** Cómo conseguirlo, con palabras propias. Nunca copiado de otra guía. */
  how: z.string().max(2000).optional(),
  /** Aviso corto y accionable: qué hay que hacer antes de avanzar. */
  warning: z.string().max(1000).optional(),
  /** id de un punto de no retorno declarado en `pointsOfNoReturn`. */
  pointOfNoReturn: idSchema.optional(),
  source: sourceSchema.optional(),
});

const pointOfNoReturnSchema = z.object({
  id: idSchema,
  chapter: idSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  /** apiName de los logros que dejan de poder conseguirse al pasar este punto. */
  locks: z.array(z.string().min(1).max(128)).min(1),
});

export const guidePackSchema = z
  .object({
    schemaVersion: z.literal(1),
    appid: z.number().int().positive(),
    game: z.string().min(1).max(200),
    /** Idioma en el que están los textos del paquete. */
    locale: z.enum(['es', 'en']),
    /** Fecha de la última revisión, en formato AAAA-MM-DD. */
    updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: sourceSchema.optional(),
    /** Nota general del paquete: de dónde salen los datos, qué falta. */
    note: z.string().max(2000).optional(),
    chapters: z.array(chapterSchema).max(200).default([]),
    /** apiName del logro -> datos de guía. */
    achievements: z.record(z.string().min(1).max(128), entrySchema).default({}),
    pointsOfNoReturn: z.array(pointOfNoReturnSchema).max(200).default([]),
  })
  .superRefine((pack, ctx) => {
    const chapterIds = new Set(pack.chapters.map((chapter) => chapter.id));
    const pointIds = new Set(pack.pointsOfNoReturn.map((point) => point.id));

    if (chapterIds.size !== pack.chapters.length) {
      ctx.addIssue({ code: 'custom', message: 'hay capítulos con el mismo id', path: ['chapters'] });
    }
    if (pointIds.size !== pack.pointsOfNoReturn.length) {
      ctx.addIssue({ code: 'custom', message: 'hay puntos de no retorno con el mismo id', path: ['pointsOfNoReturn'] });
    }

    for (const [apiName, entry] of Object.entries(pack.achievements)) {
      if (entry.chapter !== undefined && !chapterIds.has(entry.chapter)) {
        ctx.addIssue({
          code: 'custom',
          message: `el capítulo "${entry.chapter}" no está declarado en chapters`,
          path: ['achievements', apiName, 'chapter'],
        });
      }
      if (entry.pointOfNoReturn !== undefined && !pointIds.has(entry.pointOfNoReturn)) {
        ctx.addIssue({
          code: 'custom',
          message: `el punto de no retorno "${entry.pointOfNoReturn}" no está declarado`,
          path: ['achievements', apiName, 'pointOfNoReturn'],
        });
      }
    }

    for (const point of pack.pointsOfNoReturn) {
      if (point.chapter !== undefined && !chapterIds.has(point.chapter)) {
        ctx.addIssue({
          code: 'custom',
          message: `el capítulo "${point.chapter}" no está declarado en chapters`,
          path: ['pointsOfNoReturn', point.id, 'chapter'],
        });
      }
      for (const apiName of point.locks) {
        if (!(apiName in pack.achievements)) {
          ctx.addIssue({
            code: 'custom',
            message: `"${apiName}" se bloquea pero no está descrito en achievements`,
            path: ['pointsOfNoReturn', point.id, 'locks'],
          });
        }
      }
    }
  });

export type GuidePack = z.infer<typeof guidePackSchema>;
export type GuideChapter = z.infer<typeof chapterSchema>;
export type GuideEntry = z.infer<typeof entrySchema>;
export type PointOfNoReturn = z.infer<typeof pointOfNoReturnSchema>;

export function parseGuidePack(data: unknown): GuidePack {
  return guidePackSchema.parse(data);
}

export function safeParseGuidePack(data: unknown): z.ZodSafeParseResult<GuidePack> {
  return guidePackSchema.safeParse(data);
}

/** Un logro de Steam con lo que la guía sepa de él (o nada). */
export interface GuidedAchievement extends CatalogAchievement {
  unlocked: boolean;
  unlockTime: number;
  guide: GuideEntry | null;
  chapter: GuideChapter | null;
  type: AchievementType;
}

export interface MergeInput extends CatalogAchievement {
  unlocked: boolean;
  unlockTime: number;
}

/**
 * Pega la guía sobre los logros de Steam. Steam manda: un apiName que la guía
 * menciona pero que el juego no tiene se ignora, porque el juego es la verdad.
 */
export function mergeGuide(achievements: readonly MergeInput[], pack: GuidePack | null): GuidedAchievement[] {
  const chapters = new Map((pack?.chapters ?? []).map((chapter) => [chapter.id, chapter]));
  return achievements.map((achievement) => {
    const entry = pack?.achievements[achievement.apiName] ?? null;
    return {
      ...achievement,
      guide: entry,
      chapter: entry?.chapter !== undefined ? chapters.get(entry.chapter) ?? null : null,
      type: entry?.type ?? 'sin-clasificar',
    };
  });
}

/** Capítulos ordenados como van en el juego. */
export function orderedChapters(pack: GuidePack | null): GuideChapter[] {
  return [...(pack?.chapters ?? [])].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'es'));
}

export interface PointWarning {
  point: PointOfNoReturn;
  chapter: GuideChapter | null;
  /** Logros de este punto que todavía faltan. */
  missing: string[];
}

/**
 * Qué puntos de no retorno hay por delante con logros todavía pendientes.
 * `currentChapterId` es lo que la persona declara estar jugando; si no declara
 * nada, se avisa de todos los puntos que tengan algo pendiente.
 */
export function pendingPointsOfNoReturn(
  pack: GuidePack | null,
  unlockedApiNames: ReadonlySet<string>,
  currentChapterId: string | null,
): PointWarning[] {
  if (!pack) return [];
  const chapters = new Map(pack.chapters.map((chapter) => [chapter.id, chapter]));
  const currentOrder =
    currentChapterId !== null ? chapters.get(currentChapterId)?.order ?? null : null;

  const warnings: PointWarning[] = [];
  for (const point of pack.pointsOfNoReturn) {
    const chapter = point.chapter !== undefined ? chapters.get(point.chapter) ?? null : null;
    // Un punto que ya quedó atrás no sirve de aviso: ya no se puede hacer nada.
    if (currentOrder !== null && chapter !== null && chapter.order < currentOrder) continue;
    const missing = point.locks.filter((apiName) => !unlockedApiNames.has(apiName));
    if (missing.length === 0) continue;
    warnings.push({ point, chapter, missing });
  }

  return warnings.sort((a, b) => (a.chapter?.order ?? Number.MAX_SAFE_INTEGER) - (b.chapter?.order ?? Number.MAX_SAFE_INTEGER));
}

export interface GuideCoverage {
  total: number;
  classified: number;
  withHow: number;
  missable: number;
}

/** Cuánto del paquete está realmente completo. La interfaz lo muestra tal cual. */
export function guideCoverage(totalAchievements: number, pack: GuidePack | null): GuideCoverage {
  const entries = Object.values(pack?.achievements ?? {});
  return {
    total: totalAchievements,
    classified: entries.filter((entry) => entry.type !== 'sin-clasificar').length,
    withHow: entries.filter((entry) => (entry.how ?? '') !== '').length,
    missable: entries.filter((entry) => entry.type === 'perdible').length,
  };
}
