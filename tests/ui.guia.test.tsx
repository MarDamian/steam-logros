// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { screen, waitFor, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { useLocalServer } from './helpers/server';
import { renderApp } from './helpers/render';

const DEMO = '76561198000000001';
const RUTA = `/u/${DEMO}/2358720`;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => cleanup());

describe('con un paquete de guía completo', () => {
  it('avisa del punto de no retorno y solo de lo que falta', async () => {
    useLocalServer({ guide: 'completo' });
    renderApp(RUTA);

    const titulo = await screen.findByRole('heading', { name: /puntos de no retorno/i });
    const panel = titulo.closest('section') as HTMLElement;
    expect(within(panel).getByText('Antes del jefe final del Capítulo 1')).toBeTruthy();

    // 81003 ya está desbloqueado en el perfil de ejemplo; 81024 no, así que
    // el panel lista exactamente uno.
    expect(within(panel).getByText(/Te faltan 1 de aquí/)).toBeTruthy();
    const pendientes = within(panel).getAllByRole('listitem').map((item) => item.textContent);
    expect(pendientes).toEqual(['La misión de las mil millas']);
  });

  it('muestra el tipo, el capítulo, el cómo y el aviso de cada logro', async () => {
    useLocalServer({ guide: 'completo' });
    renderApp(RUTA);

    await screen.findByText(/5 de 81 logros clasificados/);
    // Acotado a la lista: el filtro de tipo también tiene estas etiquetas.
    const lista = within(screen.getByRole('list', { name: 'Logros del juego' }));
    expect(lista.getAllByText('Se puede perder')).toHaveLength(2);
    expect(lista.getAllByText('Historia')).toHaveLength(1);
    expect(lista.getAllByText('Sin clasificar')).toHaveLength(76);
    expect(screen.getByText('Completá el encargo largo antes de cerrar el capítulo.')).toBeTruthy();
    expect(screen.getByText('Queda fuera de alcance al pasar al Capítulo 2.')).toBeTruthy();
  });

  it('filtra por tipo', async () => {
    useLocalServer({ guide: 'completo' });
    renderApp(RUTA);
    await screen.findByText(/5 de 81 logros clasificados/);

    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'perdible');
    await waitFor(() => expect(screen.getByText(/^2 \/ 81$/)).toBeTruthy());
    expect(screen.queryByText('Atrás queda el hogar')).toBeNull();
  });

  it('el capítulo actual deja de avisar de los puntos que quedaron atrás', async () => {
    useLocalServer({ guide: 'completo' });
    renderApp(RUTA);
    await screen.findByRole('heading', { name: /puntos de no retorno/i });

    await userEvent.selectOptions(screen.getByLabelText('¿En qué capítulo vas?'), 'capitulo-3');
    await waitFor(() => expect(screen.queryByRole('heading', { name: /puntos de no retorno/i })).toBeNull());

    // Y la elección queda guardada para la próxima vez.
    expect(window.localStorage.getItem('logros:capitulo:2358720')).toBe('capitulo-3');
  });

  it('guarda una nota propia en el dispositivo', async () => {
    useLocalServer({ guide: 'completo' });
    renderApp(RUTA);
    await screen.findByText(/5 de 81 logros clasificados/);

    const notas = screen.getAllByText('Mi nota');
    await userEvent.click(notas[0] as HTMLElement);
    const campo = screen.getAllByPlaceholderText(/Lo que quieras recordar/)[0] as HTMLTextAreaElement;
    await userEvent.type(campo, 'Volver por el cofre');

    await waitFor(() => {
      const guardado = window.localStorage.getItem('logros:notas:2358720') ?? '{}';
      expect(guardado).toContain('Volver por el cofre');
    });
  });
});

describe('con el paquete real de Wukong', () => {
  it('dice que los 81 logros están clasificados y cuántos son perdibles', async () => {
    useLocalServer({ guide: 'real' });
    renderApp(RUTA);

    expect(await screen.findByText(/81 de 81 logros clasificados, 11 marcados como perdibles/)).toBeTruthy();
    // Ya no queda nada sin clasificar en la lista.
    const lista = within(screen.getByRole('list', { name: 'Logros del juego' }));
    expect(lista.queryAllByText('Sin clasificar')).toHaveLength(0);
    expect(lista.getAllByText('Se puede perder')).toHaveLength(11);
  });

  it('avisa de los puntos de no retorno que todavía tienen logros pendientes', async () => {
    useLocalServer({ guide: 'real' });
    renderApp(RUTA);

    const titulo = await screen.findByRole('heading', { name: /puntos de no retorno/i });
    const panel = titulo.closest('section') as HTMLElement;
    // El perfil de ejemplo no tiene ninguno de los perdibles del Capítulo 4.
    expect(within(panel).getByText('Pelear contra Duskveil')).toBeTruthy();
    expect(within(panel).getAllByText(/Te faltan \d+ de aquí/).length).toBeGreaterThan(0);
    expect(within(panel).getByText('Caminos imprevisibles')).toBeTruthy();
  });

  it('cada perdible explica qué lo bloquea', async () => {
    useLocalServer({ guide: 'real' });
    renderApp(RUTA);
    await screen.findByText(/81 de 81 logros clasificados/);

    expect(screen.getByText(/La pelea contra Duskveil cierra esta línea para siempre/)).toBeTruthy();
    expect(screen.getByText(/El Señor Escorpión desaparece al pelear contra Duskveil/)).toBeTruthy();
  });
});

describe('sin paquete de guía', () => {
  it('el juego funciona igual, solo con los datos de Steam', async () => {
    useLocalServer({ guide: 'ninguno' });
    renderApp(RUTA);

    expect(await screen.findByText(/todavía no tiene paquete de guía/)).toBeTruthy();
    expect(screen.getByText('Atrás queda el hogar')).toBeTruthy();
    expect(screen.queryByLabelText('Tipo')).toBeNull();
    expect(screen.queryByRole('heading', { name: /puntos de no retorno/i })).toBeNull();
  });
});
