import { useCallback, useState } from 'react';
import { readJson, readText, writeJson, writeText } from './storage';

/** Nota y marca propia de un logro. Vive solo en este dispositivo. */
export interface AchievementNote {
  note: string;
  /** Marca personal: "esto ya lo tengo resuelto", aunque Steam no lo sepa. */
  done: boolean;
  updatedAt: number;
}

export type NotesByAchievement = Record<string, AchievementNote>;

export const notesKey = (appid: number) => `logros:notas:${appid}`;
export const chapterKey = (appid: number) => `logros:capitulo:${appid}`;

export function readNotes(appid: number): NotesByAchievement {
  const stored = readJson<NotesByAchievement>(notesKey(appid), {});
  // Lo que haya en localStorage puede ser de una versión vieja o estar tocado a mano.
  const clean: NotesByAchievement = {};
  for (const [apiName, value] of Object.entries(stored)) {
    if (!value || typeof value !== 'object') continue;
    const { note, done, updatedAt } = value as Partial<AchievementNote>;
    clean[apiName] = {
      note: typeof note === 'string' ? note : '',
      done: done === true,
      updatedAt: typeof updatedAt === 'number' ? updatedAt : 0,
    };
  }
  return clean;
}

export interface NotesController {
  notes: NotesByAchievement;
  noteFor: (apiName: string) => AchievementNote;
  setNote: (apiName: string, note: string) => void;
  toggleDone: (apiName: string) => void;
  /** Cuántos logros tienen nota o marca propia. */
  count: number;
}

const EMPTY: AchievementNote = { note: '', done: false, updatedAt: 0 };

export function useNotes(appid: number): NotesController {
  const [notes, setNotes] = useState<NotesByAchievement>(() => readNotes(appid));

  const update = useCallback(
    (apiName: string, patch: Partial<AchievementNote>) => {
      setNotes((previous) => {
        const current = previous[apiName] ?? EMPTY;
        const next: AchievementNote = { ...current, ...patch, updatedAt: Date.now() };
        const all = { ...previous, [apiName]: next };
        // Una nota vacía y sin marca no vale la pena guardarla.
        if (next.note === '' && !next.done) delete all[apiName];
        writeJson(notesKey(appid), all);
        return all;
      });
    },
    [appid],
  );

  const noteFor = useCallback((apiName: string) => notes[apiName] ?? EMPTY, [notes]);
  const setNote = useCallback((apiName: string, note: string) => update(apiName, { note }), [update]);
  const toggleDone = useCallback(
    (apiName: string) => {
      setNotes((previous) => {
        const current = previous[apiName] ?? EMPTY;
        const next: AchievementNote = { ...current, done: !current.done, updatedAt: Date.now() };
        const all = { ...previous, [apiName]: next };
        if (next.note === '' && !next.done) delete all[apiName];
        writeJson(notesKey(appid), all);
        return all;
      });
    },
    [appid],
  );

  return { notes, noteFor, setNote, toggleDone, count: Object.keys(notes).length };
}

/** Capítulo que la persona declara estar jugando, recordado por juego. */
export function useCurrentChapter(appid: number): [string | null, (chapterId: string | null) => void] {
  const [chapter, setChapterState] = useState<string | null>(() => readText(chapterKey(appid)));

  const setChapter = useCallback(
    (chapterId: string | null) => {
      setChapterState(chapterId);
      writeText(chapterKey(appid), chapterId ?? '');
    },
    [appid],
  );

  return [chapter === '' ? null : chapter, setChapter];
}
