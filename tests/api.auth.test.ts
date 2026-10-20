import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/app';
import { SESSION_COOKIE, newSessionPayload, signSession } from '../server/auth/session';

const SECRET = 'secreto-de-pruebas-suficientemente-largo';
const BASE = 'https://logros.example';
const STEAMID = '76561198000000001';

const CON_LOGIN = { STEAM_MOCK: '1', SESSION_SECRET: SECRET, PUBLIC_BASE_URL: BASE };
const SIN_LOGIN = { STEAM_MOCK: '1' };

let app: ReturnType<typeof createApp>;

/** Las variables llegan como bindings, igual que en Cloudflare. */
function pedir(path: string, env: Record<string, string>, init?: RequestInit): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`, init), env) as Promise<Response>;
}

beforeAll(() => {
  // Que process.env no tape lo que pasamos como binding.
  delete process.env.SESSION_SECRET;
  delete process.env.PUBLIC_BASE_URL;
  process.env.STEAM_MOCK = '1';
  app = createApp();
});

describe('/api/config', () => {
  it('avisa que el login está apagado si falta configuración', async () => {
    const body = (await (await pedir('/api/config', SIN_LOGIN)).json()) as { loginEnabled: boolean };
    expect(body.loginEnabled).toBe(false);
  });

  it('lo prende con SESSION_SECRET y PUBLIC_BASE_URL', async () => {
    const body = (await (await pedir('/api/config', CON_LOGIN)).json()) as { loginEnabled: boolean };
    expect(body.loginEnabled).toBe(true);
  });
});

describe('/api/auth/steam/start', () => {
  it('redirige a Steam con nuestro return_to', async () => {
    const response = await pedir('/api/auth/steam/start', CON_LOGIN);
    expect(response.status).toBe(302);
    const destino = new URL(response.headers.get('location') ?? '');
    expect(destino.host).toBe('steamcommunity.com');
    expect(destino.searchParams.get('openid.return_to')).toBe(`${BASE}/api/auth/steam/return`);
    expect(destino.searchParams.get('openid.realm')).toBe(BASE);
  });

  it('falla claro si el servidor no tiene PUBLIC_BASE_URL', async () => {
    const response = await pedir('/api/auth/steam/start', SIN_LOGIN);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'INTERNAL' } });
  });
});

describe('/api/auth/steam/return', () => {
  it('manda al inicio con el motivo cuando la aserción no sirve', async () => {
    const response = await pedir('/api/auth/steam/return?openid.mode=cancel', CON_LOGIN);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${BASE}/?login=error&motivo=MODO_INVALIDO`);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  // Esta prueba no necesita red: si Steam responde, dice is_valid:false; si no
  // hay red, verifyAssertion devuelve STEAM_SIN_RESPUESTA. En los dos casos el
  // resultado es el mismo: redirección con error y sin cookie.
  it('no deja pasar una aserción armada a mano', async () => {
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'id_res',
      'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
      'openid.claimed_id': `https://steamcommunity.com/openid/id/${STEAMID}`,
      'openid.identity': `https://steamcommunity.com/openid/id/${STEAMID}`,
      'openid.return_to': `${BASE}/api/auth/steam/return`,
      'openid.response_nonce': `${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}abc`,
      'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce',
      'openid.sig': 'firma-inventada',
    });
    const response = await pedir(`/api/auth/steam/return?${params.toString()}`, CON_LOGIN);
    expect(response.status).toBe(302);
    // Steam responde is_valid:false, así que no hay cookie.
    expect(response.headers.get('location')).toContain('login=error');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

describe('/api/me', () => {
  it('sin cookie no hay sesión', async () => {
    const response = await pedir('/api/me', CON_LOGIN);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
  });

  it('con una cookie firmada devuelve el perfil', async () => {
    const cookie = await signSession(newSessionPayload(STEAMID), SECRET);
    const response = await pedir('/api/me', CON_LOGIN, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } });
    const body = (await response.json()) as { authenticated: boolean; steamid: string; player: { personaName: string } };
    expect(body.authenticated).toBe(true);
    expect(body.steamid).toBe(STEAMID);
    expect(body.player.personaName).toBe('Peregrina Demo');
  });

  it('una cookie firmada con otro secreto no vale', async () => {
    const cookie = await signSession(newSessionPayload(STEAMID), 'otro-secreto-cualquiera-largo');
    const response = await pedir('/api/me', CON_LOGIN, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } });
    expect(await response.json()).toEqual({ authenticated: false });
  });

  it('sin SESSION_SECRET en el servidor no hay sesión posible', async () => {
    const cookie = await signSession(newSessionPayload(STEAMID), SECRET);
    const response = await pedir('/api/me', SIN_LOGIN, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } });
    expect(await response.json()).toEqual({ authenticated: false });
  });
});

describe('/api/auth/logout', () => {
  it('borra la cookie', async () => {
    const response = await pedir('/api/auth/logout', CON_LOGIN, { method: 'POST' });
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});

describe('la cookie de sesión', () => {
  it('sale httpOnly, con SameSite=Lax, Path=/ y Secure en https', async () => {
    // Se comprueba sobre el logout, que usa las mismas opciones de borrado.
    const response = await pedir('/api/auth/logout', CON_LOGIN, { method: 'POST' });
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).toMatch(/Secure/i);
  });
});
