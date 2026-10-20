/**
 * Sesión en cookie firmada. No hay base de datos: la cookie guarda el SteamID
 * y una firma HMAC-SHA256 hecha con SESSION_SECRET. Si alguien la toca, la
 * firma no valida y la sesión se descarta.
 *
 * Usa Web Crypto, que existe igual en Node, Cloudflare Workers, Vercel y Netlify.
 */
import { STEAMID64_RE } from '../../shared/steamid';

export interface SessionPayload {
  /** SteamID64 de quien entró. */
  sub: string;
  /** Emitida en (segundos epoch). */
  iat: number;
  /** Vence en (segundos epoch). */
  exp: number;
}

export const SESSION_COOKIE = 'logros_sesion';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const VERSION = 'v1';

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  // ArrayBuffer explícito: Web Crypto no acepta un buffer que podría ser compartido.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Devuelve el valor completo de la cookie: v1.<payload>.<firma> */
export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${VERSION}.${body}`));
  return `${VERSION}.${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Valida firma, formato y vencimiento. Devuelve null ante cualquier duda. */
export async function verifySession(
  cookieValue: string | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;
  const [version, body, signature] = parts as [string, string, string];
  if (version !== VERSION || body === '' || signature === '') return null;

  let valid: boolean;
  try {
    const key = await importKey(secret);
    valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(signature),
      new TextEncoder().encode(`${version}.${body}`),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;
  const { sub, iat, exp } = payload as Record<string, unknown>;
  if (typeof sub !== 'string' || !STEAMID64_RE.test(sub)) return null;
  if (typeof iat !== 'number' || typeof exp !== 'number') return null;
  if (exp <= nowSeconds) return null;
  // Una cookie "emitida en el futuro" es señal de manipulación o de reloj roto.
  if (iat > nowSeconds + 300) return null;

  return { sub, iat, exp };
}

export function newSessionPayload(steamid: string, nowSeconds = Math.floor(Date.now() / 1000)): SessionPayload {
  return { sub: steamid, iat: nowSeconds, exp: nowSeconds + SESSION_TTL_SECONDS };
}

export function generateSecretHint(): string {
  return 'openssl rand -hex 32';
}
