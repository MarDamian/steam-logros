import { useQuery } from '@tanstack/react-query';
import { safeParseGuidePack, type GuidePack } from '@shared/guide';

interface GuideIndex {
  guides: { appid: number }[];
}

async function fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { headers: { accept: 'application/json' }, signal });
  if (!response.ok) return null;
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

/** Lista de juegos que tienen paquete de guía. Evita pedir 404 por cada juego. */
export function useGuideIndex() {
  return useQuery({
    queryKey: ['guide-index'],
    queryFn: async ({ signal }) => {
      const data = await fetchJson('/games/index.json', signal);
      const guides = (data as GuideIndex | null)?.guides;
      return Array.isArray(guides) ? guides.map((guide) => guide.appid) : [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Trae el paquete de guía de un juego, si existe. Un paquete roto se trata como
 * "no hay guía": el juego tiene que seguir funcionando con los datos de Steam.
 */
export function useGuide(appid: number, available: number[] | undefined) {
  const exists = available === undefined ? undefined : available.includes(appid);

  return useQuery({
    queryKey: ['guide', appid],
    enabled: exists === true,
    staleTime: 60 * 60 * 1000,
    queryFn: async ({ signal }): Promise<GuidePack | null> => {
      const data = await fetchJson(`/games/${appid}.json`, signal);
      if (data === null) return null;
      const result = safeParseGuidePack(data);
      if (!result.success) {
        console.warn(`El paquete de guía de ${appid} no cumple el esquema y se ignora.`);
        return null;
      }
      return result.data;
    },
  });
}
