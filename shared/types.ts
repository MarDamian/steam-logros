/** Tipos que comparten cliente y servidor. Son los DTO de nuestra API, no las
 *  respuestas crudas de Steam (esas se validan y traducen en server/steam). */

export type Locale = 'es' | 'en';
export type SteamLanguage = 'spanish' | 'english';

export const STEAM_LANGUAGE_BY_LOCALE: Record<Locale, SteamLanguage> = {
  es: 'spanish',
  en: 'english',
};

/** Códigos de error de la API. El cliente traduce cada código a un mensaje. */
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'PRIVATE_PROFILE'
  | 'PROFILE_NOT_FOUND'
  | 'NO_STATS'
  | 'NO_API_KEY'
  | 'RATE_LIMITED'
  | 'STEAM_UNAVAILABLE'
  | 'INTERNAL';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    /** Detalle en texto plano. El cliente prefiere su propia traducción del código. */
    message: string;
  };
}

export interface ResolvedProfile {
  steamid: string;
}

export interface PlayerSummary {
  steamid: string;
  personaName: string;
  avatar: string;
  profileUrl: string;
  /** communityvisibilitystate === 3 */
  isPublic: boolean;
}

export interface LibraryGame {
  appid: number;
  name: string;
  playtimeMinutes: number;
  /** Solo presente si Steam devolvió img_icon_url. */
  iconUrl: string | null;
  /** has_community_visible_stats: si es false, el juego no tiene logros públicos. */
  hasStats: boolean;
}

export interface LibraryResponse {
  steamid: string;
  games: LibraryGame[];
}

/** Progreso resumido de un juego, para las tarjetas de la biblioteca. */
export interface GameProgressSummary {
  appid: number;
  total: number;
  unlocked: number;
  /** Motivo por el que no se pudo calcular (el juego no tiene logros, etc.). */
  unavailable?: Extract<ApiErrorCode, 'NO_STATS' | 'PRIVATE_PROFILE' | 'STEAM_UNAVAILABLE'>;
}

export interface CatalogAchievement {
  apiName: string;
  displayName: string;
  description: string;
  /** Steam marca así los logros que esconde la descripción hasta desbloquearlos. */
  hidden: boolean;
  icon: string;
  iconGray: string;
  /** Porcentaje de jugadores que lo tienen. null si Steam no lo informa. */
  globalPercent: number | null;
}

/** Catálogo de logros de un juego: no depende del jugador, así que se cachea largo. */
export interface GameCatalog {
  appid: number;
  gameName: string;
  language: SteamLanguage;
  achievements: CatalogAchievement[];
}

/** Progreso del jugador en un juego: apiName -> unlocktime en segundos (0 si Steam no lo sabe). */
export interface PlayerProgress {
  steamid: string;
  appid: number;
  unlocked: Record<string, number>;
  total: number;
}
