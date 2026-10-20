import { readText, writeText } from './storage';

const KEY = 'logros:miperfil';

/**
 * Qué perfil considera "suyo" esta persona en este dispositivo. Se guarda
 * cuando pega su SteamID o cuando entra con Steam, y sirve para avisar
 * cuando lo que se está mirando es el progreso de otra persona.
 */
export function rememberOwnProfile(steamid: string): void {
  if (/^\d{17}$/.test(steamid)) writeText(KEY, steamid);
}

export function ownProfile(): string | null {
  const stored = readText(KEY);
  return stored !== null && /^\d{17}$/.test(stored) ? stored : null;
}

/** true solo si sabemos de quién es este dispositivo y el perfil es otro. */
export function isSomeoneElse(steamid: string): boolean {
  const own = ownProfile();
  return own !== null && own !== steamid;
}
