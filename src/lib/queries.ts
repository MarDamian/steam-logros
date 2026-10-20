import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import type { GameProgressSummary, Locale, SteamLanguage } from '@shared/types';
import { STEAM_LANGUAGE_BY_LOCALE } from '@shared/types';
import { api, PROGRESS_BATCH_MAX } from './api';

export function steamLanguageFor(locale: Locale): SteamLanguage {
  return STEAM_LANGUAGE_BY_LOCALE[locale];
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: ({ signal }) => api.config(signal),
    staleTime: 60 * 60 * 1000,
  });
}

export function useSession() {
  return useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => api.me(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlayer(steamid: string | null) {
  return useQuery({
    queryKey: ['player', steamid],
    queryFn: ({ signal }) => api.player(steamid as string, signal),
    enabled: steamid !== null,
    staleTime: 10 * 60 * 1000,
  });
}

export function useLibrary(steamid: string | null) {
  return useQuery({
    queryKey: ['library', steamid],
    queryFn: ({ signal }) => api.library(steamid as string, signal),
    enabled: steamid !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCatalog(appid: number, language: SteamLanguage) {
  return useQuery({
    queryKey: ['catalog', appid, language],
    queryFn: ({ signal }) => api.catalog(appid, language, signal),
    staleTime: 60 * 60 * 1000,
  });
}

export function useProgress(steamid: string | null, appid: number) {
  return useQuery({
    queryKey: ['progress', steamid, appid],
    queryFn: ({ signal }) => api.progress(steamid as string, appid, signal),
    enabled: steamid !== null,
    staleTime: 2 * 60 * 1000,
  });
}

const summaryKey = (steamid: string, appid: number) => ['progress-summary', steamid, appid] as const;

export interface LibraryProgressController {
  /** Resumen ya conocido de un juego, o null si todavía no se pidió. */
  get: (appid: number) => GameProgressSummary | null;
  /** Encola juegos para pedir su progreso (ignora los ya pedidos). */
  request: (appids: readonly number[]) => void;
  /** Cuántos juegos quedan en la cola. */
  pendingCount: number;
  isLoading: boolean;
}

/** Lee lo que ya esté en la caché de queries para este perfil. */
function hydrateFromCache(
  queryClient: QueryClient,
  steamid: string | null,
): Map<number, GameProgressSummary> {
  const map = new Map<number, GameProgressSummary>();
  if (steamid === null) return map;
  const entries = queryClient.getQueriesData<GameProgressSummary>({
    queryKey: ['progress-summary', steamid],
  });
  for (const [, summary] of entries) {
    if (summary) map.set(summary.appid, summary);
  }
  return map;
}

/**
 * GetOwnedGames no trae el conteo de logros, así que hay que preguntar juego por
 * juego. Acá se encolan los appids y se piden en lotes, de uno en uno, para no
 * castigar a Steam ni al servidor. Cada resultado se guarda además en la caché
 * de TanStack Query, así vuelve a estar disponible al navegar de ida y vuelta.
 */
export function useLibraryProgress(steamid: string | null): LibraryProgressController {
  const queryClient = useQueryClient();
  const [summaries, setSummaries] = useState<Map<number, GameProgressSummary>>(() =>
    hydrateFromCache(queryClient, steamid),
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // La cola y el candado nunca se leen durante el render, solo en los callbacks.
  const queue = useRef<{ steamid: string; appid: number }[]>([]);
  const queued = useRef(new Set<string>());
  const draining = useRef(false);

  const drain = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    setIsLoading(true);
    try {
      while (queue.current.length > 0) {
        // Un lote es siempre de un mismo perfil, aunque se haya cambiado en el medio.
        const first = queue.current[0];
        if (!first) break;
        const batchOwner = first.steamid;
        const batch: number[] = [];
        while (batch.length < PROGRESS_BATCH_MAX && queue.current[0]?.steamid === batchOwner) {
          const item = queue.current.shift();
          if (item) batch.push(item.appid);
        }
        setPendingCount(queue.current.length);

        let results: GameProgressSummary[];
        try {
          results = (await api.libraryProgress(batchOwner, batch)).progress;
        } catch {
          // Si el lote falla no se reintenta solo: marcamos el motivo y seguimos.
          results = batch.map((appid) => ({
            appid,
            total: 0,
            unlocked: 0,
            unavailable: 'STEAM_UNAVAILABLE' as const,
          }));
        }

        for (const summary of results) {
          queryClient.setQueryData(summaryKey(batchOwner, summary.appid), summary);
        }
        if (batchOwner === steamid) {
          setSummaries((previous) => {
            const next = new Map(previous);
            for (const summary of results) next.set(summary.appid, summary);
            return next;
          });
        }
      }
    } finally {
      draining.current = false;
      setIsLoading(false);
      setPendingCount(0);
    }
  }, [queryClient, steamid]);

  const request = useCallback(
    (appids: readonly number[]) => {
      if (steamid === null) return;
      let added = false;
      for (const appid of appids) {
        const key = `${steamid}:${appid}`;
        if (queued.current.has(key)) continue;
        queued.current.add(key);
        queue.current.push({ steamid, appid });
        added = true;
      }
      if (!added) return;
      setPendingCount(queue.current.length);
      void drain();
    },
    [drain, steamid],
  );

  const get = useCallback((appid: number) => summaries.get(appid) ?? null, [summaries]);

  return { get, request, pendingCount, isLoading };
}
