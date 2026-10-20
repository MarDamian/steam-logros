/** Un SteamID64 es siempre un número de 17 dígitos. */
export const STEAMID64_RE = /^\d{17}$/;

export type ProfileInput =
  | { kind: 'steamid64'; value: string }
  | { kind: 'vanity'; value: string }
  | { kind: 'invalid' };

const VANITY_RE = /^[A-Za-z0-9_-]{2,32}$/;

/**
 * Interpreta lo que pega la persona: un SteamID64, una URL de perfil
 * (/profiles/<id> o /id/<vanity>) o directamente un nombre de URL personalizada.
 */
export function parseProfileInput(raw: string): ProfileInput {
  const input = raw.trim();
  if (input === '') return { kind: 'invalid' };

  if (STEAMID64_RE.test(input)) return { kind: 'steamid64', value: input };

  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  if (/steamcommunity\.com/i.test(input)) {
    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      return { kind: 'invalid' };
    }
    if (!/(^|\.)steamcommunity\.com$/i.test(url.hostname)) return { kind: 'invalid' };

    const parts = url.pathname.split('/').filter(Boolean);
    const [section, slug] = parts;
    if (section === 'profiles' && slug && STEAMID64_RE.test(slug)) {
      return { kind: 'steamid64', value: slug };
    }
    if (section === 'id' && slug && VANITY_RE.test(slug)) {
      return { kind: 'vanity', value: slug };
    }
    return { kind: 'invalid' };
  }

  // Un texto todo numérico que no tiene 17 dígitos es casi siempre un SteamID
  // mal copiado, no una URL personalizada. Decirlo así da un error más claro.
  // Quien de verdad tenga una URL personalizada numérica puede pegar la URL /id/ completa.
  if (/^\d+$/.test(input)) return { kind: 'invalid' };

  if (VANITY_RE.test(input)) return { kind: 'vanity', value: input };
  return { kind: 'invalid' };
}

export function isSteamId64(value: string): boolean {
  return STEAMID64_RE.test(value);
}
