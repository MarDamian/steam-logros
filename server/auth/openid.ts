/**
 * Login con OpenID 2.0 de Steam (el único que ofrece Valve).
 *
 * Steam actúa de proveedor OpenID y responde con una aserción firmada por él.
 * Nunca se confía en los parámetros que vuelven en la URL: siempre se verifican
 * contra Steam con `check_authentication` (modo stateless), que es lo único que
 * prueba que la firma es de Steam y no de quien armó el enlace.
 *
 * El login solo identifica a la persona. No da acceso a nada de su cuenta:
 * Steam no entrega contraseña, correo ni permisos.
 */

export const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';

/** El claimed_id de Steam es siempre esta URL con un SteamID64 de 17 dígitos. */
export const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/** Campos que la firma de Steam tiene que cubrir para que la aserción sirva. */
const REQUIRED_SIGNED_FIELDS = ['claimed_id', 'identity', 'return_to', 'response_nonce', 'op_endpoint'] as const;

/** Margen de validez del nonce de la respuesta. */
const NONCE_MAX_AGE_SECONDS = 10 * 60;

export const RETURN_PATH = '/api/auth/steam/return';

export function returnToUrl(baseUrl: string): string {
  return `${trimSlash(baseUrl)}${RETURN_PATH}`;
}

export function realmFor(baseUrl: string): string {
  return trimSlash(baseUrl);
}

/** URL a la que se manda a la persona para que Steam le pregunte si acepta. */
export function buildLoginUrl(baseUrl: string): string {
  const url = new URL(STEAM_OPENID_ENDPOINT);
  url.searchParams.set('openid.ns', OPENID_NS);
  url.searchParams.set('openid.mode', 'checkid_setup');
  url.searchParams.set('openid.return_to', returnToUrl(baseUrl));
  url.searchParams.set('openid.realm', realmFor(baseUrl));
  url.searchParams.set('openid.identity', IDENTIFIER_SELECT);
  url.searchParams.set('openid.claimed_id', IDENTIFIER_SELECT);
  return url.toString();
}

export type VerifyFailure =
  | 'MODO_INVALIDO'
  | 'NAMESPACE_INVALIDO'
  | 'ENDPOINT_INVALIDO'
  | 'CLAIMED_ID_INVALIDO'
  | 'IDENTITY_DISTINTA'
  | 'RETURN_TO_INVALIDO'
  | 'FIRMA_INCOMPLETA'
  | 'NONCE_INVALIDO'
  | 'NONCE_REPETIDO'
  | 'STEAM_DIJO_NO'
  | 'STEAM_SIN_RESPUESTA';

export type VerifyResult = { ok: true; steamid: string; nonce: string } | { ok: false; reason: VerifyFailure };

export interface VerifyOptions {
  /** URL pública de la app, la misma con la que se armó el login. */
  baseUrl: string;
  /** Para probar sin red. */
  fetchImpl?: typeof fetch;
  /** Devuelve true si el nonce ya se usó (protección contra reenvío). */
  isNonceUsed?: (nonce: string) => Promise<boolean>;
  now?: Date;
}

/**
 * Valida la aserción que vuelve de Steam. Primero todo lo que se puede
 * comprobar sin red, y recién al final la consulta a Steam.
 */
export async function verifyAssertion(params: URLSearchParams, options: VerifyOptions): Promise<VerifyResult> {
  const get = (name: string) => params.get(`openid.${name}`) ?? '';

  if (get('mode') !== 'id_res') return fail('MODO_INVALIDO');
  if (get('ns') !== OPENID_NS) return fail('NAMESPACE_INVALIDO');
  if (get('op_endpoint') !== STEAM_OPENID_ENDPOINT) return fail('ENDPOINT_INVALIDO');

  const claimedId = get('claimed_id');
  const match = CLAIMED_ID_RE.exec(claimedId);
  if (!match) return fail('CLAIMED_ID_INVALIDO');
  const steamid = match[1] as string;

  // identity y claimed_id tienen que apuntar a la misma persona.
  if (get('identity') !== claimedId) return fail('IDENTITY_DISTINTA');

  // return_to debe ser exactamente el nuestro: si no, la aserción es de otra app.
  if (get('return_to') !== returnToUrl(options.baseUrl)) return fail('RETURN_TO_INVALIDO');

  const signed = get('signed').split(',');
  if (!REQUIRED_SIGNED_FIELDS.every((field) => signed.includes(field))) return fail('FIRMA_INCOMPLETA');
  if (get('sig') === '') return fail('FIRMA_INCOMPLETA');

  const nonce = get('response_nonce');
  if (!isFreshNonce(nonce, options.now ?? new Date())) return fail('NONCE_INVALIDO');
  if (options.isNonceUsed && (await options.isNonceUsed(nonce))) return fail('NONCE_REPETIDO');

  // Solo Steam puede decir si esa firma es suya.
  const body = new URLSearchParams();
  for (const [key, value] of params) {
    if (key.startsWith('openid.')) body.set(key, value);
  }
  body.set('openid.mode', 'check_authentication');

  const doFetch = options.fetchImpl ?? fetch;
  let text: string;
  try {
    const response = await doFetch(STEAM_OPENID_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return fail('STEAM_SIN_RESPUESTA');
    text = await response.text();
  } catch {
    return fail('STEAM_SIN_RESPUESTA');
  }

  if (!isValidResponse(text)) return fail('STEAM_DIJO_NO');
  return { ok: true, steamid, nonce };
}

/** La respuesta es texto tipo key-value: buscamos exactamente is_valid:true. */
export function isValidResponse(text: string): boolean {
  return text
    .split('\n')
    .map((line) => line.trim())
    .includes('is_valid:true');
}

/**
 * El nonce empieza con una marca de tiempo ISO 8601 puesta por Steam.
 * Rechazamos los viejos: acota la ventana para reenviar una aserción.
 */
export function isFreshNonce(nonce: string, now: Date): boolean {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/.exec(nonce);
  if (!match) return false;
  const issued = Date.parse(match[1] as string);
  if (Number.isNaN(issued)) return false;
  const ageSeconds = (now.getTime() - issued) / 1000;
  return ageSeconds >= -NONCE_MAX_AGE_SECONDS && ageSeconds <= NONCE_MAX_AGE_SECONDS;
}

function fail(reason: VerifyFailure): VerifyResult {
  return { ok: false, reason };
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
