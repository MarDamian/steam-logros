import { describe, expect, it } from 'vitest';
import { parseProfileInput } from '../shared/steamid';

describe('parseProfileInput', () => {
  it('acepta un SteamID64 de 17 dígitos', () => {
    expect(parseProfileInput('76561197960435530')).toEqual({ kind: 'steamid64', value: '76561197960435530' });
    expect(parseProfileInput('  76561197960435530  ')).toEqual({ kind: 'steamid64', value: '76561197960435530' });
  });

  it('rechaza números que no tienen 17 dígitos', () => {
    expect(parseProfileInput('7656119796043553').kind).toBe('invalid');
    expect(parseProfileInput('765611979604355301').kind).toBe('invalid');
  });

  it('saca el SteamID64 de una URL /profiles/', () => {
    for (const url of [
      'https://steamcommunity.com/profiles/76561197960435530',
      'https://steamcommunity.com/profiles/76561197960435530/',
      'steamcommunity.com/profiles/76561197960435530',
      'http://www.steamcommunity.com/profiles/76561197960435530/stats/',
    ]) {
      expect(parseProfileInput(url)).toEqual({ kind: 'steamid64', value: '76561197960435530' });
    }
  });

  it('saca el nombre de una URL /id/', () => {
    expect(parseProfileInput('https://steamcommunity.com/id/perfil-demo/')).toEqual({
      kind: 'vanity',
      value: 'perfil-demo',
    });
  });

  it('acepta un nombre de URL personalizada pelado', () => {
    expect(parseProfileInput('perfil-demo')).toEqual({ kind: 'vanity', value: 'perfil-demo' });
  });

  it('no se deja engañar por dominios parecidos', () => {
    expect(parseProfileInput('https://steamcommunity.com.malo.example/id/alguien').kind).toBe('invalid');
    expect(parseProfileInput('https://notsteamcommunity.com/id/alguien').kind).toBe('invalid');
  });

  it('rechaza vacíos y rutas que no son de perfil', () => {
    expect(parseProfileInput('').kind).toBe('invalid');
    expect(parseProfileInput('   ').kind).toBe('invalid');
    expect(parseProfileInput('https://steamcommunity.com/app/2358720').kind).toBe('invalid');
  });
});
