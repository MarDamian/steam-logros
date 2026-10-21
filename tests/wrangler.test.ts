import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Comprueba la configuración de Cloudflare.
 *
 * Existe por un error concreto: con `not_found_handling:
 * single-page-application`, los estáticos se sirven ANTES que el Worker, así
 * que cualquier *navegación* del navegador a una ruta que no es un archivo
 * recibe index.html y el Worker nunca corre. Las llamadas desde JavaScript sí
 * llegaban, porque no son navegaciones — de ahí que la API funcionara y el
 * botón de "Entrar con Steam" se limitara a recargar la página.
 *
 * El login de Steam son dos navegaciones: ir a /api/auth/steam/start y volver a
 * /api/auth/steam/return. Sin run_worker_first, no hay login.
 */
interface WranglerConfig {
  name: string;
  main: string;
  compatibility_date: string;
  assets?: {
    directory: string;
    binding?: string;
    not_found_handling?: string;
    run_worker_first?: boolean | string[];
  };
  kv_namespaces?: { binding: string; id: string }[];
}

function leerConfig(): WranglerConfig {
  const texto = readFileSync('wrangler.jsonc', 'utf8')
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('//'))
    .join('\n');
  return JSON.parse(texto) as WranglerConfig;
}

const config = leerConfig();

describe('wrangler.jsonc', () => {
  it('apunta al adaptador de Workers y a los estáticos compilados', () => {
    expect(config.main).toBe('server/adapters/worker.ts');
    expect(config.assets?.directory).toBe('./dist/client');
    expect(config.assets?.binding).toBe('ASSETS');
  });

  it('sirve el index.html en las rutas del router del cliente', () => {
    expect(config.assets?.not_found_handling).toBe('single-page-application');
  });

  it('corre el Worker antes de los estáticos en toda la API', () => {
    const primero = config.assets?.run_worker_first;
    expect(primero, 'sin run_worker_first el login de Steam no funciona').toBeDefined();
    if (primero === true) return;
    expect(Array.isArray(primero)).toBe(true);
    const patrones = primero as string[];
    // Tiene que cubrir /api/auth/..., que son navegaciones de verdad.
    expect(
      patrones.some((patron) => patron === '/api/*' || patron.startsWith('/api/auth')),
      `los patrones ${JSON.stringify(patrones)} no cubren /api/auth/`,
    ).toBe(true);
  });

  it('declara el namespace de KV con el nombre de binding que busca el código', () => {
    expect(config.kv_namespaces?.[0]?.binding).toBe('CACHE');
    expect(config.kv_namespaces?.[0]?.id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('tiene una fecha de compatibilidad con forma de fecha', () => {
    expect(config.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
