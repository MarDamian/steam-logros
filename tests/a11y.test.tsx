// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import axe from 'axe-core';
import { useLocalServer } from './helpers/server';
import { renderApp } from './helpers/render';

/**
 * Revisión automática de accesibilidad sobre las tres vistas.
 *
 * jsdom no pinta nada, así que las reglas que necesitan geometría o color real
 * (contraste, tamaño del objetivo táctil) no se pueden evaluar acá: el
 * contraste se verifica aparte, por número, en tests/contraste.test.ts.
 */
const REGLAS_SIN_RENDER = ['color-contrast', 'target-size'];

async function revisar(): Promise<axe.Result[]> {
  const resultado = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: Object.fromEntries(REGLAS_SIN_RENDER.map((id) => [id, { enabled: false }])),
  });
  return resultado.violations;
}

function describir(violaciones: axe.Result[]): string {
  return violaciones
    .map((v) => `${v.id} (${v.impact ?? 'sin impacto'}): ${v.help} → ${v.nodes.map((n) => n.html).join(' | ')}`)
    .join('\n');
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => cleanup());

describe('accesibilidad', () => {
  it('la pantalla de inicio no tiene violaciones', async () => {
    useLocalServer({ login: true });
    renderApp('/');
    await screen.findByRole('heading', { name: /Mirá tus logros/i });

    const violaciones = await revisar();
    expect(describir(violaciones)).toBe('');
  });

  it('la biblioteca no tiene violaciones', async () => {
    useLocalServer();
    renderApp('/u/76561198000000001');
    await screen.findByText('Black Myth: Wukong');

    const violaciones = await revisar();
    expect(describir(violaciones)).toBe('');
  });

  it('la vista de juego con guía no tiene violaciones', async () => {
    useLocalServer({ guide: 'completo' });
    renderApp('/u/76561198000000001/2358720');
    await screen.findByText(/5 de 81 logros clasificados/);

    const violaciones = await revisar();
    expect(describir(violaciones)).toBe('');
  });

  it('la pantalla de mis datos no tiene violaciones', async () => {
    useLocalServer();
    renderApp('/datos');
    await screen.findByRole('heading', { name: /Mis datos/i });

    const violaciones = await revisar();
    expect(describir(violaciones)).toBe('');
  });
});

describe('teclado', () => {
  it('todo lo interactivo es alcanzable con el tabulador', async () => {
    useLocalServer({ guide: 'completo' });
    renderApp('/u/76561198000000001/2358720');
    await screen.findByText(/5 de 81 logros clasificados/);

    const interactivos = [...document.querySelectorAll('a[href], button, input, select, textarea, summary')];
    expect(interactivos.length).toBeGreaterThan(20);

    const fueraDeOrden = interactivos.filter((elemento) => {
      const tabIndex = elemento.getAttribute('tabindex');
      // tabindex positivo rompe el orden natural; -1 lo saca del tabulador.
      return tabIndex !== null && Number(tabIndex) !== 0;
    });
    expect(fueraDeOrden.map((e) => e.outerHTML.slice(0, 80))).toEqual([]);
  });

  it('el enlace para saltar al contenido apunta a algo que existe', async () => {
    useLocalServer();
    renderApp('/');
    const salto = await screen.findByRole('link', { name: /Inicio/i });
    const destino = (salto.getAttribute('href') ?? '').replace('#', '');
    expect(document.getElementById(destino)).not.toBeNull();
  });
});
