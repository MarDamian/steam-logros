import { describe, expect, it } from 'vitest';
import { newSessionPayload, signSession, verifySession } from '../server/auth/session';

const SECRET = 'un-secreto-de-pruebas-bastante-largo';
const STEAMID = '76561198000000001';

describe('cookie de sesión firmada', () => {
  it('va y vuelve con el mismo SteamID', async () => {
    const cookie = await signSession(newSessionPayload(STEAMID), SECRET);
    const session = await verifySession(cookie, SECRET);
    expect(session?.sub).toBe(STEAMID);
  });

  it('rechaza una firma hecha con otro secreto', async () => {
    const cookie = await signSession(newSessionPayload(STEAMID), SECRET);
    expect(await verifySession(cookie, 'otro-secreto-distinto')).toBeNull();
  });

  it('rechaza un payload manipulado', async () => {
    const cookie = await signSession(newSessionPayload(STEAMID), SECRET);
    const [version, , signature] = cookie.split('.');
    const otroPayload = Buffer.from(
      JSON.stringify({ sub: '76561198000000999', iat: 1, exp: 9_999_999_999 }),
    ).toString('base64url');
    expect(await verifySession(`${version}.${otroPayload}.${signature}`, SECRET)).toBeNull();
  });

  it('rechaza una sesión vencida', async () => {
    const ahora = 1_800_000_000;
    const cookie = await signSession({ sub: STEAMID, iat: ahora - 100, exp: ahora - 1 }, SECRET);
    expect(await verifySession(cookie, SECRET, ahora)).toBeNull();
  });

  it('rechaza una sesión emitida en el futuro', async () => {
    const ahora = 1_800_000_000;
    const cookie = await signSession({ sub: STEAMID, iat: ahora + 3600, exp: ahora + 7200 }, SECRET);
    expect(await verifySession(cookie, SECRET, ahora)).toBeNull();
  });

  it('rechaza un sub que no es un SteamID64', async () => {
    const cookie = await signSession(
      { sub: 'no-es-un-steamid', iat: 1, exp: 9_999_999_999 },
      SECRET,
    );
    expect(await verifySession(cookie, SECRET)).toBeNull();
  });

  it('rechaza cookies con formato roto', async () => {
    expect(await verifySession(undefined, SECRET)).toBeNull();
    expect(await verifySession('', SECRET)).toBeNull();
    expect(await verifySession('solo-una-parte', SECRET)).toBeNull();
    expect(await verifySession('v2.aaa.bbb', SECRET)).toBeNull();
    expect(await verifySession('v1..bbb', SECRET)).toBeNull();
  });
});
