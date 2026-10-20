import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Contraste WCAG calculado sobre los tokens de color de verdad. No hace falta
 * un navegador para esto: los valores salen de src/styles/tokens.css.
 *
 * Umbrales de WCAG 2.1 AA: 4.5:1 para texto normal, 3:1 para texto grande
 * (>=24px o >=18.66px en negrita) y para los bordes de los controles.
 */
// Sin comentarios: si no, quedan pegados al selector del bloque siguiente.
const css = readFileSync('src/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function tokensDe(selector: string): Record<string, string> {
  // Toma todos los bloques que coincidan con el selector y los une en orden,
  // que es como los aplica el navegador.
  const tokens: Record<string, string> = {};
  for (const bloque of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const encabezado = bloque[1] ?? '';
    if (encabezado.trim() !== selector) continue;
    for (const declaracion of (bloque[2] ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      const nombre = declaracion[1];
      const valor = declaracion[2];
      if (nombre !== undefined && valor !== undefined) tokens[nombre] = valor.trim();
    }
  }
  return tokens;
}

function canalLineal(valor: number): number {
  const s = valor / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminancia(hex: string): number {
  const limpio = hex.replace('#', '');
  const completo =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;
  const r = Number.parseInt(completo.slice(0, 2), 16);
  const g = Number.parseInt(completo.slice(2, 4), 16);
  const b = Number.parseInt(completo.slice(4, 6), 16);
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b);
}

export function contraste(primerPlano: string, fondo: string): number {
  const a = luminancia(primerPlano);
  const b = luminancia(fondo);
  const claro = Math.max(a, b);
  const oscuro = Math.min(a, b);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Pares que tienen que cumplir 4.5:1 porque son texto normal. */
const TEXTO_NORMAL: [string, string][] = [
  ['--text', '--bg'],
  ['--text', '--bg-elev'],
  ['--text', '--bg-elev-2'],
  ['--text-dim', '--bg'],
  ['--text-dim', '--bg-elev'],
  ['--text-dim', '--bg-elev-2'],
  ['--link', '--bg'],
  ['--link', '--bg-elev'],
  ['--danger', '--bg-elev'],
  ['--ok', '--bg-elev'],
  ['--warn', '--bg-elev'],
  ['--rarity-comun', '--bg-elev'],
  ['--rarity-pocoComun', '--bg-elev'],
  ['--rarity-rara', '--bg-elev'],
  ['--rarity-muyRara', '--bg-elev'],
  ['--rarity-ultraRara', '--bg-elev'],
  ['--type-historia', '--bg-elev'],
  ['--type-perdible', '--bg-elev'],
  ['--type-cualquier', '--bg-elev'],
  ['--type-ngplus', '--bg-elev'],
  ['--type-sin', '--bg-elev'],
  ['--accent-ink', '--accent'],
];

/** Texto auxiliar y bordes: alcanza 3:1. */
const TEXTO_GRANDE_Y_BORDES: [string, string][] = [
  ['--text-faint', '--bg'],
  ['--text-faint', '--bg-elev'],
  ['--border-strong', '--bg'],
  ['--accent', '--bg'],
  ['--accent', '--bg-elev'],
];

describe.each([
  ['tema oscuro', ':root'],
  ['tema claro', ":root[data-theme='light']"],
])('%s', (_nombre, selector) => {
  const base = tokensDe(':root');
  const tokens = selector === ':root' ? base : { ...base, ...tokensDe(selector) };

  function color(nombre: string): string {
    const valor = tokens[nombre];
    expect(valor, `falta el token ${nombre}`).toBeTruthy();
    expect(valor, `${nombre} no es un color hex: ${valor ?? ''}`).toMatch(/^#[0-9a-f]{3,8}$/i);
    return valor as string;
  }

  it.each(TEXTO_NORMAL)('%s sobre %s llega a 4.5:1', (primerPlano, fondo) => {
    const ratio = contraste(color(primerPlano), color(fondo));
    expect(ratio, `${primerPlano} sobre ${fondo} da ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEXTO_GRANDE_Y_BORDES)('%s sobre %s llega a 3:1', (primerPlano, fondo) => {
    const ratio = contraste(color(primerPlano), color(fondo));
    expect(ratio, `${primerPlano} sobre ${fondo} da ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });
});
