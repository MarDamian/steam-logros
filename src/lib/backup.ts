/**
 * Exportar e importar lo que la app guarda en este dispositivo: notas por
 * logro, marcas propias y el capítulo en el que vas de cada juego. No hay
 * servidor donde guardarlo, así que el archivo JSON es la única forma de
 * llevárselo a otro teléfono o de no perderlo al limpiar el navegador.
 */
import { z } from 'zod';
import { readNotes, type AchievementNote, type NotesByAchievement } from './notes';
import { writeJson, writeText } from './storage';

export const BACKUP_VERSION = 1;

const noteSchema = z.object({
  note: z.string().default(''),
  done: z.boolean().default(false),
  updatedAt: z.number().default(0),
});

export const backupSchema = z.object({
  app: z.literal('steam-logros'),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  /** appid -> apiName -> nota */
  notes: z.record(z.string().regex(/^\d+$/), z.record(z.string(), noteSchema)).default({}),
  /** appid -> id del capítulo actual */
  chapters: z.record(z.string().regex(/^\d+$/), z.string()).default({}),
  preferences: z
    .object({
      locale: z.enum(['es', 'en']).optional(),
      theme: z.enum(['system', 'light', 'dark']).optional(),
    })
    .optional(),
});

export type BackupFile = z.infer<typeof backupSchema>;

const NOTES_PREFIX = 'logros:notas:';
const CHAPTER_PREFIX = 'logros:capitulo:';

function storageKeys(): string[] {
  if (typeof window === 'undefined') return [];
  const keys: string[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key !== null) keys.push(key);
    }
  } catch {
    return [];
  }
  return keys;
}

function readPreferences(): BackupFile['preferences'] {
  const locale = window.localStorage.getItem('logros:locale');
  const theme = window.localStorage.getItem('logros:theme');
  return {
    ...(locale === 'es' || locale === 'en' ? { locale } : {}),
    ...(theme === 'system' || theme === 'light' || theme === 'dark' ? { theme } : {}),
  };
}

export function buildBackup(): BackupFile {
  const notes: Record<string, NotesByAchievement> = {};
  const chapters: Record<string, string> = {};

  for (const key of storageKeys()) {
    if (key.startsWith(NOTES_PREFIX)) {
      const appid = key.slice(NOTES_PREFIX.length);
      if (!/^\d+$/.test(appid)) continue;
      const stored = readNotes(Number(appid));
      if (Object.keys(stored).length > 0) notes[appid] = stored;
    } else if (key.startsWith(CHAPTER_PREFIX)) {
      const appid = key.slice(CHAPTER_PREFIX.length);
      if (!/^\d+$/.test(appid)) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null && value !== '') chapters[appid] = value;
    }
  }

  return {
    app: 'steam-logros',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    notes,
    chapters,
    preferences: readPreferences(),
  };
}

export interface BackupSummary {
  games: number;
  notes: number;
  chapters: number;
}

export function summarize(backup: BackupFile): BackupSummary {
  const notes = Object.values(backup.notes).reduce((total, byGame) => total + Object.keys(byGame).length, 0);
  const games = new Set([...Object.keys(backup.notes), ...Object.keys(backup.chapters)]).size;
  return { games, notes, chapters: Object.keys(backup.chapters).length };
}

export type ImportMode = 'mezclar' | 'reemplazar';

/**
 * Aplica un respaldo. Al mezclar gana la nota más reciente de cada logro, que es
 * lo que uno espera cuando importa el archivo del teléfono en la computadora.
 */
export function applyBackup(backup: BackupFile, mode: ImportMode): BackupSummary {
  for (const [appid, incoming] of Object.entries(backup.notes)) {
    const existing = mode === 'reemplazar' ? {} : readNotes(Number(appid));
    const merged: NotesByAchievement = { ...existing };
    for (const [apiName, note] of Object.entries(incoming)) {
      const current = merged[apiName];
      if (current === undefined || note.updatedAt >= current.updatedAt) {
        merged[apiName] = note satisfies AchievementNote;
      }
    }
    writeJson(`${NOTES_PREFIX}${appid}`, merged);
  }

  for (const [appid, chapterId] of Object.entries(backup.chapters)) {
    writeText(`${CHAPTER_PREFIX}${appid}`, chapterId);
  }

  if (backup.preferences?.locale !== undefined) writeText('logros:locale', backup.preferences.locale);
  if (backup.preferences?.theme !== undefined) writeText('logros:theme', backup.preferences.theme);

  return summarize(backup);
}

export function parseBackup(raw: string): { ok: true; backup: BackupFile } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'El archivo no es JSON válido.' };
  }
  const result = backupSchema.safeParse(data);
  if (!result.success) {
    return { ok: false, error: 'El archivo no tiene el formato de un respaldo de esta app.' };
  }
  return { ok: true, backup: result.data };
}

/** Borra todo lo que la app guardó en este dispositivo. */
export function clearLocalData(): number {
  const keys = storageKeys().filter((key) => key.startsWith('logros:'));
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ídem */
    }
  }
  return keys.length;
}

export function backupFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `logros-steam-${date}.json`;
}
