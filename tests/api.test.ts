import { beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';
import { createApp } from '../server/app';

let app: Hono<{ Bindings: Record<string, unknown> }>;

async function get(path: string): Promise<Response> {
  return await app.fetch(new Request(`http://localhost${path}`));
}

beforeAll(() => {
  process.env.STEAM_MOCK = '1';
  app = createApp() as never;
});

describe('validación de parámetros', () => {
  it('rechaza un steamid que no tiene 17 dígitos', async () => {
    const response = await get('/api/library/123');
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'BAD_REQUEST' } });
  });

  it('rechaza un appid que no es numérico', async () => {
    const response = await get('/api/game/abc/catalog');
    expect(response.status).toBe(400);
  });

  it('no existe ningún endpoint fuera de la lista permitida', async () => {
    const response = await get('/api/proxy?url=https://example.com');
    expect(response.status).toBe(404);
  });

  it('limita el tamaño del lote de progreso', async () => {
    const appids = Array.from({ length: 13 }, (_, index) => index + 1).join(',');
    const response = await get(`/api/library/76561198000000001/progress?appids=${appids}`);
    expect(response.status).toBe(400);
  });
});

describe('perfiles', () => {
  it('resuelve una URL personalizada', async () => {
    const response = await get('/api/resolve?input=https://steamcommunity.com/id/perfil-demo/');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ steamid: '76561198000000001' });
  });

  it('devuelve PROFILE_NOT_FOUND cuando la URL personalizada no existe', async () => {
    const response = await get('/api/resolve?input=no-existe-este-perfil');
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'PROFILE_NOT_FOUND' } });
  });

  it('marca el perfil privado con un código propio', async () => {
    const response = await get('/api/library/76561198000000002');
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'PRIVATE_PROFILE' } });
  });
});

describe('catálogo y progreso', () => {
  it('devuelve los 81 logros de Wukong con porcentaje global', async () => {
    const response = await get('/api/game/2358720/catalog');
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      gameName: string;
      achievements: { apiName: string; globalPercent: number | null; hidden: boolean }[];
    };
    expect(body.gameName).toBe('Black Myth: Wukong');
    expect(body.achievements).toHaveLength(81);
    expect(body.achievements.filter((achievement) => achievement.hidden)).toHaveLength(62);
    expect(body.achievements[0]).toMatchObject({ apiName: '81001', globalPercent: 97.7 });
  });

  it('respeta el idioma pedido', async () => {
    const response = await get('/api/game/2358720/catalog?lang=english');
    const body = (await response.json()) as { achievements: { displayName: string }[] };
    expect(body.achievements[0]?.displayName).toBe('Home is Behind');
  });

  it('devuelve el progreso del jugador con fechas de desbloqueo', async () => {
    const response = await get('/api/progress/76561198000000001/2358720');
    const body = (await response.json()) as { total: number; unlocked: Record<string, number> };
    expect(body.total).toBe(81);
    expect(Object.keys(body.unlocked)).toHaveLength(32);
    expect(body.unlocked['81001']).toBeGreaterThan(0);
  });

  it('en el lote, un juego sin logros no rompe al resto', async () => {
    const response = await get('/api/library/76561198000000001/progress?appids=2358720,431960');
    const body = (await response.json()) as { progress: { appid: number; unavailable?: string }[] };
    expect(body.progress).toHaveLength(2);
    expect(body.progress.find((entry) => entry.appid === 431960)?.unavailable).toBe('NO_STATS');
    expect(body.progress.find((entry) => entry.appid === 2358720)?.unavailable).toBeUndefined();
  });

  it('no filtra la clave de Steam en la respuesta de configuración', async () => {
    const response = await get('/api/config');
    const text = await response.text();
    expect(text).not.toMatch(/key|STEAM_API_KEY/i);
  });
});
