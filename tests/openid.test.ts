import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  CLAIMED_ID_RE,
  STEAM_OPENID_ENDPOINT,
  buildLoginUrl,
  isFreshNonce,
  isValidResponse,
  verifyAssertion,
} from '../server/auth/openid';

const BASE = 'https://logros.example';
const RETURN_TO = `${BASE}/api/auth/steam/return`;
const STEAMID = '76561197960435530';
const AHORA = new Date('2026-10-20T14:05:00Z');

const respuesta = (archivo: string) =>
  readFileSync(new URL(`./fixtures/openid/${archivo}`, import.meta.url), 'utf8');

/** Aserción con la forma exacta que manda Steam en un id_res. */
function assertionValida(cambios: Record<string, string> = {}): URLSearchParams {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.op_endpoint': STEAM_OPENID_ENDPOINT,
    'openid.claimed_id': `https://steamcommunity.com/openid/id/${STEAMID}`,
    'openid.identity': `https://steamcommunity.com/openid/id/${STEAMID}`,
    'openid.return_to': RETURN_TO,
    'openid.response_nonce': '2026-10-20T14:04:30Z8Wz1Qq',
    'openid.assoc_handle': '1234567890',
    'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    'openid.sig': 'Lm9uZVNpZ25hdHVyZQ==',
  });
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === '') params.delete(clave);
    else params.set(clave, valor);
  }
  return params;
}

function steamResponde(archivo: string): typeof fetch {
  return vi.fn(async () => new Response(respuesta(archivo), { status: 200 }));
}

describe('buildLoginUrl', () => {
  it('arma la URL de checkid_setup con nuestro return_to y realm', () => {
    const url = new URL(buildLoginUrl(`${BASE}/`));
    expect(url.origin + url.pathname).toBe(STEAM_OPENID_ENDPOINT);
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup');
    expect(url.searchParams.get('openid.return_to')).toBe(RETURN_TO);
    expect(url.searchParams.get('openid.realm')).toBe(BASE);
    expect(url.searchParams.get('openid.identity')).toBe('http://specs.openid.net/auth/2.0/identifier_select');
  });
});

describe('CLAIMED_ID_RE', () => {
  it('solo acepta la URL de Steam con 17 dígitos', () => {
    expect(CLAIMED_ID_RE.test(`https://steamcommunity.com/openid/id/${STEAMID}`)).toBe(true);
    expect(CLAIMED_ID_RE.test('https://steamcommunity.com/openid/id/7656119796043553')).toBe(false);
    expect(CLAIMED_ID_RE.test('https://steamcommunity.com/openid/id/765611979604355301')).toBe(false);
    expect(CLAIMED_ID_RE.test('http://steamcommunity.com/openid/id/76561197960435530')).toBe(false);
    expect(CLAIMED_ID_RE.test('https://malo.example/openid/id/76561197960435530')).toBe(false);
    expect(CLAIMED_ID_RE.test(`https://steamcommunity.com/openid/id/${STEAMID}?x=1`)).toBe(false);
  });
});

describe('isValidResponse', () => {
  it('lee la respuesta real de Steam ante una aserción falsa', () => {
    expect(isValidResponse(respuesta('is-valid-false.txt'))).toBe(false);
  });

  it('acepta solo la línea exacta is_valid:true', () => {
    expect(isValidResponse(respuesta('is-valid-true.txt'))).toBe(true);
    expect(isValidResponse('is_valid:false\nis_valid_other:true')).toBe(false);
    expect(isValidResponse('esto no es is_valid:true porque va en una frase')).toBe(false);
  });
});

describe('isFreshNonce', () => {
  it('acepta el nonce reciente y rechaza el viejo', () => {
    expect(isFreshNonce('2026-10-20T14:04:30Zabc', AHORA)).toBe(true);
    expect(isFreshNonce('2026-10-20T13:40:00Zabc', AHORA)).toBe(false);
    expect(isFreshNonce('2026-10-20T15:00:00Zabc', AHORA)).toBe(false);
    expect(isFreshNonce('sin-fecha', AHORA)).toBe(false);
  });
});

describe('verifyAssertion', () => {
  it('acepta una aserción que Steam confirma', async () => {
    const result = await verifyAssertion(assertionValida(), {
      baseUrl: BASE,
      fetchImpl: steamResponde('is-valid-true.txt'),
      now: AHORA,
    });
    expect(result).toEqual({ ok: true, steamid: STEAMID, nonce: '2026-10-20T14:04:30Z8Wz1Qq' });
  });

  it('manda a Steam todos los parámetros con mode=check_authentication', async () => {
    const fetchSpy = vi.fn(async () => new Response(respuesta('is-valid-true.txt'), { status: 200 }));
    await verifyAssertion(assertionValida(), {
      baseUrl: BASE,
      fetchImpl: fetchSpy,
      now: AHORA,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(STEAM_OPENID_ENDPOINT);
    expect(init.method).toBe('POST');
    const enviado = new URLSearchParams(init.body as string);
    expect(enviado.get('openid.mode')).toBe('check_authentication');
    expect(enviado.get('openid.sig')).toBe('Lm9uZVNpZ25hdHVyZQ==');
    expect(enviado.get('openid.claimed_id')).toBe(`https://steamcommunity.com/openid/id/${STEAMID}`);
  });

  it('no le cree a la aserción aunque venga perfecta si Steam dice que no', async () => {
    const result = await verifyAssertion(assertionValida(), {
      baseUrl: BASE,
      fetchImpl: steamResponde('is-valid-false.txt'),
      now: AHORA,
    });
    expect(result).toEqual({ ok: false, reason: 'STEAM_DIJO_NO' });
  });

  const rechazos: [string, Record<string, string>, string][] = [
    ['el modo no es id_res', { 'openid.mode': 'cancel' }, 'MODO_INVALIDO'],
    ['el namespace es otro', { 'openid.ns': 'http://example.com/openid' }, 'NAMESPACE_INVALIDO'],
    ['el op_endpoint no es el de Steam', { 'openid.op_endpoint': 'https://malo.example/openid/login' }, 'ENDPOINT_INVALIDO'],
    [
      'el claimed_id apunta a otro dominio',
      { 'openid.claimed_id': 'https://malo.example/openid/id/76561197960435530' },
      'CLAIMED_ID_INVALIDO',
    ],
    [
      'el claimed_id no tiene 17 dígitos',
      { 'openid.claimed_id': 'https://steamcommunity.com/openid/id/123' },
      'CLAIMED_ID_INVALIDO',
    ],
    [
      'identity y claimed_id no coinciden',
      { 'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000002' },
      'IDENTITY_DISTINTA',
    ],
    ['el return_to es de otra app', { 'openid.return_to': 'https://otra.example/api/auth/steam/return' }, 'RETURN_TO_INVALIDO'],
    ['el return_to cambia de ruta', { 'openid.return_to': `${BASE}/otra-ruta` }, 'RETURN_TO_INVALIDO'],
    ['la firma no cubre el claimed_id', { 'openid.signed': 'signed,op_endpoint,identity,return_to,response_nonce' }, 'FIRMA_INCOMPLETA'],
    ['no hay firma', { 'openid.sig': '' }, 'FIRMA_INCOMPLETA'],
    ['el nonce es viejo', { 'openid.response_nonce': '2026-10-20T10:00:00Zabc' }, 'NONCE_INVALIDO'],
  ];

  it.each(rechazos)('rechaza cuando %s', async (_caso, cambios, motivo) => {
    const fetchSpy = vi.fn(async () => new Response(respuesta('is-valid-true.txt'), { status: 200 }));
    const result = await verifyAssertion(assertionValida(cambios), {
      baseUrl: BASE,
      fetchImpl: fetchSpy,
      now: AHORA,
    });
    expect(result).toEqual({ ok: false, reason: motivo });
    // Nada de esto debe llegar a consultarle a Steam.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rechaza un nonce ya usado', async () => {
    const result = await verifyAssertion(assertionValida(), {
      baseUrl: BASE,
      fetchImpl: steamResponde('is-valid-true.txt'),
      isNonceUsed: async () => true,
      now: AHORA,
    });
    expect(result).toEqual({ ok: false, reason: 'NONCE_REPETIDO' });
  });

  it('no inventa una sesión si Steam no contesta', async () => {
    const result = await verifyAssertion(assertionValida(), {
      baseUrl: BASE,
      fetchImpl: vi.fn(async () => {
        throw new Error('sin red');
      }),
      now: AHORA,
    });
    expect(result).toEqual({ ok: false, reason: 'STEAM_SIN_RESPUESTA' });
  });
});
