import type { GuidedAchievement } from '@shared/guide';
import type { GameProgressSummary, LibraryGame } from '@shared/types';

export type LibrarySort = 'name' | 'playtime' | 'completion' | 'closest';
export type AchievementSort = 'easiest' | 'hardest' | 'name' | 'recent' | 'default';

export const LIBRARY_SORTS_NEEDING_PROGRESS = new Set<LibrarySort>(['completion', 'closest']);

type ProgressLookup = (appid: number) => GameProgressSummary | null;

function completionOf(game: LibraryGame, get: ProgressLookup): number | null {
  const summary = get(game.appid);
  if (!summary || summary.total === 0) return null;
  return (summary.unlocked / summary.total) * 100;
}

const byName = (a: LibraryGame, b: LibraryGame) => a.name.localeCompare(b.name, 'es');

export function sortGames(
  games: readonly LibraryGame[],
  sort: LibrarySort,
  get: ProgressLookup,
): LibraryGame[] {
  const list = [...games];
  switch (sort) {
    case 'name':
      return list.sort(byName);
    case 'playtime':
      return list.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes || byName(a, b));
    case 'completion':
      return list.sort((a, b) => {
        const left = completionOf(a, get);
        const right = completionOf(b, get);
        // Los juegos sin progreso cargado van al final, no al principio.
        if (left === null && right === null) return byName(a, b);
        if (left === null) return 1;
        if (right === null) return -1;
        return right - left || byName(a, b);
      });
    case 'closest':
      return list.sort((a, b) => {
        const left = completionOf(a, get);
        const right = completionOf(b, get);
        // "Más cerca del 100%" deja atrás los ya completados: ahí no queda nada por hacer.
        const leftScore = left === null || left >= 100 ? -1 : left;
        const rightScore = right === null || right >= 100 ? -1 : right;
        if (leftScore === rightScore) return byName(a, b);
        return rightScore - leftScore;
      });
    default:
      return list;
  }
}

/** El porcentaje global es el proxy de dificultad: más alto, más fácil. */
export function sortAchievements(
  list: readonly GuidedAchievement[],
  sort: AchievementSort,
): GuidedAchievement[] {
  const sorted = [...list];
  switch (sort) {
    case 'easiest':
      return sorted.sort((a, b) => (b.globalPercent ?? -1) - (a.globalPercent ?? -1));
    case 'hardest':
      return sorted.sort((a, b) => {
        // Los logros sin dato global no son "los más raros": van al final.
        const left = a.globalPercent ?? Number.POSITIVE_INFINITY;
        const right = b.globalPercent ?? Number.POSITIVE_INFINITY;
        return left - right;
      });
    case 'name':
      return sorted.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
    case 'recent':
      return sorted.sort((a, b) => b.unlockTime - a.unlockTime);
    case 'default':
    default:
      return sorted;
  }
}
