import { describe, expect, it } from 'vitest';
import { resolveGameTitle } from '../shared/gameTitle';

describe('resolveGameTitle', () => {
  it('prefiere el nombre de la tienda al del esquema de logros', () => {
    // Caso real: GetSchemaForGame devuelve "testtest" para Black Myth: Wukong.
    expect(
      resolveGameTitle({
        libraryName: 'Black Myth: Wukong',
        packName: 'Black Myth: Wukong',
        catalogName: 'testtest',
        appid: 2358720,
      }),
    ).toBe('Black Myth: Wukong');
  });

  it('usa el paquete de guía cuando no hay biblioteca cargada', () => {
    expect(resolveGameTitle({ packName: 'Black Myth: Wukong', catalogName: 'testtest', appid: 2358720 })).toBe(
      'Black Myth: Wukong',
    );
  });

  it('cae al nombre del esquema cuando es lo único que hay', () => {
    expect(resolveGameTitle({ catalogName: 'Portal 2', appid: 620 })).toBe('Portal 2');
  });

  it('ignora los vacíos y los espacios', () => {
    expect(resolveGameTitle({ libraryName: '   ', packName: '', catalogName: 'Portal 2', appid: 620 })).toBe(
      'Portal 2',
    );
  });

  it('sin ningún nombre, muestra el appid', () => {
    expect(resolveGameTitle({ appid: 620 })).toBe('App 620');
    expect(resolveGameTitle({ libraryName: undefined, catalogName: '  ', appid: 620 })).toBe('App 620');
  });
});
