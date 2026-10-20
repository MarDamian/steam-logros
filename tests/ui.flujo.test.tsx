// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { useLocalServer } from './helpers/server';
import { renderApp } from './helpers/render';

const DEMO = '76561198000000001';
const WUKONG = 2358720;

beforeAll(() => {
  useLocalServer();
  // IntersectionObserver no existe en jsdom: lo hacemos disparar al instante.
  class ObserverQueDisparaYa {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(element: Element): void {
      this.callback(
        [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    value: ObserverQueDisparaYa,
  });
});

// Sin globals de Vitest, la limpieza de testing-library hay que pedirla.
afterEach(() => cleanup());

describe('inicio', () => {
  it('avisa que el servidor está en modo ejemplo y deja entrar con un SteamID64', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /Mirá tus logros de Steam/i })).toBeTruthy();
    expect(await screen.findByText(/modo ejemplo/i)).toBeTruthy();

    const input = screen.getByLabelText(/SteamID64 o URL del perfil/i);
    const submit = screen.getByRole<HTMLButtonElement>('button', { name: /Ver mis logros/i });
    expect(submit.disabled).toBe(true);

    await userEvent.type(input, DEMO);
    expect(submit.disabled).toBe(false);
    await userEvent.click(submit);

    // Resuelve y navega a la biblioteca del perfil.
    expect(await screen.findByText('Peregrina Demo')).toBeTruthy();
  });
});

describe('biblioteca', () => {
  it('lista los juegos y carga el progreso de los visibles', async () => {
    renderApp(`/u/${DEMO}`);

    expect(await screen.findByText('Black Myth: Wukong')).toBeTruthy();
    expect(await screen.findByText('ELDEN RING')).toBeTruthy();
    expect(screen.getByText(/14 de 14 juegos/)).toBeTruthy();

    // El progreso llega por el endpoint por lotes, no con la biblioteca.
    await waitFor(() => expect(screen.getByText('32 / 81')).toBeTruthy());

    // Wallpaper Engine no tiene logros y lo dice.
    const sinLogros = await screen.findAllByText('Sin logros');
    expect(sinLogros.length).toBeGreaterThan(0);
  });

  it('filtra por nombre', async () => {
    renderApp(`/u/${DEMO}`);
    await screen.findByText('Black Myth: Wukong');
    await userEvent.type(screen.getByLabelText(/Buscar juego/i), 'elden');
    await waitFor(() => expect(screen.queryByText('Black Myth: Wukong')).toBeNull());
    expect(screen.getByText('ELDEN RING')).toBeTruthy();
  });
});

describe('vista de juego', () => {
  it('muestra los 81 logros de Wukong con rareza y fecha de desbloqueo', async () => {
    renderApp(`/u/${DEMO}/${WUKONG}`);

    expect(await screen.findByRole('heading', { name: 'Black Myth: Wukong' })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('81 / 81')).toBeTruthy());

    // Orden por defecto: "más fácil primero" pone el logro más común arriba.
    expect(await screen.findByText('Atrás queda el hogar')).toBeTruthy();
    expect(screen.getByText(/97,7% de los jugadores/)).toBeTruthy();
    expect(screen.getAllByText('Común').length).toBeGreaterThan(0);

    // Hay 32 desbloqueados y el resumen lo refleja.
    // "Desbloqueados" aparece también como filtro: acotamos al recuadro de estadística.
    const desbloqueados = screen.getByText('Desbloqueados', { selector: '.stat__label' }).previousElementSibling;
    expect(desbloqueados?.textContent).toBe('32');
  });

  it('el filtro de pendientes deja fuera los desbloqueados', async () => {
    renderApp(`/u/${DEMO}/${WUKONG}`);
    await screen.findByText('Atrás queda el hogar');

    await userEvent.click(screen.getByRole('button', { name: 'Pendientes' }));
    await waitFor(() => expect(screen.queryByText('Atrás queda el hogar')).toBeNull());
    expect(screen.getByText(/^49 \/ 81$/)).toBeTruthy();
  });

  it('explica qué hacer cuando el perfil es privado', async () => {
    renderApp('/u/76561198000000002/2358720');
    expect(await screen.findByText(/Cómo poner los logros en público/i)).toBeTruthy();
    expect(screen.getByText(/Detalles del juego/i)).toBeTruthy();
  });
});
