// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { useLocalServer } from './helpers/server';
import { renderApp } from './helpers/render';

beforeEach(() => {
  window.localStorage.clear();
  useLocalServer();
});

afterEach(() => cleanup());

describe('pantalla de mis datos', () => {
  it('dice que no hay nada y deja los botones apagados', async () => {
    renderApp('/datos');

    expect(await screen.findByText(/Todavía no hay nada guardado/)).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: /Exportar/ }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: /Borrar todo/ }).disabled).toBe(true);
  });

  it('cuenta lo que hay guardado', async () => {
    window.localStorage.setItem(
      'logros:notas:2358720',
      JSON.stringify({ '81024': { note: 'una nota', done: false, updatedAt: 5 } }),
    );
    window.localStorage.setItem('logros:capitulo:2358720', 'capitulo-2');
    renderApp('/datos');

    expect(await screen.findByText(/1 juegos, 1 notas, 1 capítulos/)).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: /Exportar/ }).disabled).toBe(false);
  });

  it('importa un archivo y lo deja aplicado', async () => {
    renderApp('/datos');
    await screen.findByText(/Todavía no hay nada guardado/);

    const contenido = JSON.stringify({
      app: 'steam-logros',
      version: 1,
      exportedAt: '2026-10-20T00:00:00Z',
      notes: { '2358720': { '81024': { note: 'desde el archivo', done: true, updatedAt: 99 } } },
      chapters: { '2358720': 'capitulo-4' },
    });
    const archivo = new File([contenido], 'respaldo.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText(/Importar desde un archivo/), archivo);

    expect(await screen.findByText(/Importado: 1 juegos, 1 notas, 1 capítulos/)).toBeTruthy();
    expect(window.localStorage.getItem('logros:capitulo:2358720')).toBe('capitulo-4');
    expect(window.localStorage.getItem('logros:notas:2358720')).toContain('desde el archivo');
    // Y el resumen de arriba se actualiza sin recargar: el texto aparece dos
    // veces, en el resumen y en el aviso de importación.
    expect(screen.getAllByText(/1 juegos, 1 notas, 1 capítulos/)).toHaveLength(2);
  });

  it('explica el problema si el archivo no es un respaldo', async () => {
    renderApp('/datos');
    await screen.findByText(/Todavía no hay nada guardado/);

    const archivo = new File(['{"app":"otra-cosa"}'], 'malo.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText(/Importar desde un archivo/), archivo);

    expect(await screen.findByText(/No se pudo importar/)).toBeTruthy();
  });

  it('borra todo cuando se confirma', async () => {
    window.localStorage.setItem('logros:notas:620', JSON.stringify({ A: { note: 'x', done: false, updatedAt: 1 } }));
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp('/datos');
    await screen.findByText(/1 juegos, 1 notas, 0 capítulos/);

    await userEvent.click(screen.getByRole('button', { name: /Borrar todo/ }));

    expect(confirmar).toHaveBeenCalled();
    // Borra todo lo de la app, también el idioma y el tema que guarda la interfaz.
    expect(await screen.findByText(/se borraron \d+ entradas/)).toBeTruthy();
    expect(window.localStorage.getItem('logros:notas:620')).toBeNull();
  });

  it('no borra nada si se cancela', async () => {
    window.localStorage.setItem('logros:notas:620', JSON.stringify({ A: { note: 'x', done: false, updatedAt: 1 } }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderApp('/datos');
    await screen.findByText(/1 juegos, 1 notas, 0 capítulos/);

    await userEvent.click(screen.getByRole('button', { name: /Borrar todo/ }));
    expect(window.localStorage.getItem('logros:notas:620')).not.toBeNull();
  });
});

describe('enlaces para compartir', () => {
  it('copia la dirección de la vista del juego', async () => {
    const escribir = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });

    renderApp('/u/76561198000000001/2358720');
    await userEvent.click(await screen.findByRole('button', { name: 'Compartir' }));

    await waitFor(() => expect(escribir).toHaveBeenCalledWith('http://localhost:3000/u/76561198000000001/2358720'));
    expect(await screen.findByText(/Enlace copiado/)).toBeTruthy();
  });

  it('avisa cuando el perfil que se mira es de otra persona', async () => {
    window.localStorage.setItem('logros:miperfil', '76561198000000009');
    renderApp('/u/76561198000000001/2358720');

    expect(await screen.findByText(/Estás viendo el progreso de otra persona/)).toBeTruthy();
  });

  it('no avisa cuando es el perfil propio', async () => {
    window.localStorage.setItem('logros:miperfil', '76561198000000001');
    renderApp('/u/76561198000000001/2358720');

    await screen.findByRole('button', { name: 'Compartir' });
    expect(screen.queryByText(/Estás viendo el progreso de otra persona/)).toBeNull();
  });
});
