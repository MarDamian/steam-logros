// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { useLocalServer } from './helpers/server';
import { renderApp } from './helpers/render';

afterEach(() => cleanup());

describe('botón de entrar con Steam', () => {
  it('queda habilitado y aclara que solo identifica cuando el login está configurado', async () => {
    useLocalServer({ login: true });
    renderApp('/');

    const boton = await screen.findByRole<HTMLButtonElement>('button', { name: /Entrar con Steam/i });
    await screen.findByText(/solo sirve para saber quién sos/i);
    expect(boton.disabled).toBe(false);
  });

  it('queda deshabilitado y explica qué falta cuando el servidor no lo tiene configurado', async () => {
    useLocalServer({ login: false });
    renderApp('/');

    const boton = await screen.findByRole<HTMLButtonElement>('button', { name: /Entrar con Steam/i });
    await screen.findByText(/no tiene configurado el login/i);
    expect(boton.disabled).toBe(true);
  });
});

describe('errores del login', () => {
  it('explica el motivo que vuelve en la URL', async () => {
    useLocalServer({ login: true });
    renderApp('/?login=error&motivo=RETURN_TO_INVALIDO');

    expect(await screen.findByText(/No se pudo completar el login con Steam/i)).toBeTruthy();
    expect(screen.getByText(/RETURN_TO_INVALIDO/)).toBeTruthy();
  });
});
