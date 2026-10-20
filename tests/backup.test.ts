// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyBackup,
  backupFileName,
  buildBackup,
  clearLocalData,
  parseBackup,
  summarize,
} from '../src/lib/backup';
import { readNotes } from '../src/lib/notes';

const nota = (note: string, updatedAt: number, done = false) => ({ note, done, updatedAt });

beforeEach(() => {
  window.localStorage.clear();
});

describe('buildBackup', () => {
  it('junta notas y capítulos de todos los juegos', () => {
    window.localStorage.setItem('logros:notas:2358720', JSON.stringify({ '81024': nota('volver al cofre', 10) }));
    window.localStorage.setItem('logros:notas:367520', JSON.stringify({ A: nota('', 5, true) }));
    window.localStorage.setItem('logros:capitulo:2358720', 'capitulo-3');
    window.localStorage.setItem('logros:locale', 'en');
    window.localStorage.setItem('logros:theme', 'light');
    // Algo ajeno a la app no debe colarse.
    window.localStorage.setItem('otra-cosa', 'x');

    const backup = buildBackup();
    expect(backup.app).toBe('steam-logros');
    expect(backup.version).toBe(1);
    expect(Object.keys(backup.notes).sort()).toEqual(['2358720', '367520']);
    expect(backup.notes['2358720']?.['81024']?.note).toBe('volver al cofre');
    expect(backup.chapters).toEqual({ '2358720': 'capitulo-3' });
    expect(backup.preferences).toEqual({ locale: 'en', theme: 'light' });
    expect(JSON.stringify(backup)).not.toContain('otra-cosa');
  });

  it('sin nada guardado sale vacío', () => {
    expect(summarize(buildBackup())).toEqual({ games: 0, notes: 0, chapters: 0 });
  });

  it('el nombre del archivo lleva la fecha', () => {
    expect(backupFileName()).toMatch(/^logros-steam-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('parseBackup', () => {
  it('acepta lo que exporta la app', () => {
    window.localStorage.setItem('logros:notas:620', JSON.stringify({ A: nota('hola', 1) }));
    const result = parseBackup(JSON.stringify(buildBackup()));
    expect(result.ok).toBe(true);
  });

  it('rechaza lo que no es un respaldo nuestro', () => {
    expect(parseBackup('esto no es json').ok).toBe(false);
    expect(parseBackup('{"app":"otra-app","version":1,"exportedAt":"x"}').ok).toBe(false);
    expect(parseBackup('{"app":"steam-logros","version":99,"exportedAt":"x"}').ok).toBe(false);
    expect(parseBackup('{"app":"steam-logros","version":1,"exportedAt":"x","notes":{"abc":{}}}').ok).toBe(false);
  });

  it('tolera un respaldo sin notas ni capítulos', () => {
    const result = parseBackup('{"app":"steam-logros","version":1,"exportedAt":"2026-10-20T00:00:00Z"}');
    expect(result.ok).toBe(true);
    expect(result.ok && summarize(result.backup)).toEqual({ games: 0, notes: 0, chapters: 0 });
  });
});

describe('applyBackup', () => {
  const respaldo = {
    app: 'steam-logros' as const,
    version: 1 as const,
    exportedAt: '2026-10-20T00:00:00Z',
    notes: { '2358720': { '81024': nota('la del archivo', 200), '81003': nota('solo en el archivo', 50) } },
    chapters: { '2358720': 'capitulo-2' },
  };

  it('al mezclar gana la nota más reciente', () => {
    window.localStorage.setItem(
      'logros:notas:2358720',
      JSON.stringify({ '81024': nota('la del dispositivo', 300) }),
    );

    applyBackup(respaldo, 'mezclar');
    const notas = readNotes(2358720);
    expect(notas['81024']?.note).toBe('la del dispositivo');
    expect(notas['81003']?.note).toBe('solo en el archivo');
  });

  it('al reemplazar se tira lo que había de ese juego', () => {
    window.localStorage.setItem(
      'logros:notas:2358720',
      JSON.stringify({ '81070': nota('se va a perder', 300) }),
    );

    applyBackup(respaldo, 'reemplazar');
    const notas = readNotes(2358720);
    expect(notas['81070']).toBeUndefined();
    expect(notas['81024']?.note).toBe('la del archivo');
  });

  it('restaura el capítulo actual', () => {
    applyBackup(respaldo, 'mezclar');
    expect(window.localStorage.getItem('logros:capitulo:2358720')).toBe('capitulo-2');
  });

  it('va y vuelve sin perder nada', () => {
    window.localStorage.setItem('logros:notas:620', JSON.stringify({ A: nota('intacta', 7, true) }));
    window.localStorage.setItem('logros:capitulo:620', 'capitulo-1');
    const exportado = JSON.parse(JSON.stringify(buildBackup())) as unknown;

    window.localStorage.clear();
    const parsed = parseBackup(JSON.stringify(exportado));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    applyBackup(parsed.backup, 'reemplazar');

    expect(readNotes(620)['A']).toEqual(nota('intacta', 7, true));
    expect(window.localStorage.getItem('logros:capitulo:620')).toBe('capitulo-1');
  });
});

describe('clearLocalData', () => {
  it('borra lo de la app y deja lo demás', () => {
    window.localStorage.setItem('logros:notas:620', '{}');
    window.localStorage.setItem('logros:capitulo:620', 'capitulo-1');
    window.localStorage.setItem('ajeno', 'se queda');

    expect(clearLocalData()).toBe(2);
    expect(window.localStorage.getItem('logros:notas:620')).toBeNull();
    expect(window.localStorage.getItem('ajeno')).toBe('se queda');
  });
});

describe('notas corruptas en localStorage', () => {
  it('no rompen la lectura', () => {
    window.localStorage.setItem('logros:notas:620', '{"A":"no soy un objeto","B":{"note":5,"done":"sí"}}');
    const notas = readNotes(620);
    expect(notas['A']).toBeUndefined();
    expect(notas['B']).toEqual({ note: '', done: false, updatedAt: 0 });
  });

  it('un JSON roto se trata como que no hay nada', () => {
    window.localStorage.setItem('logros:notas:620', '{roto');
    expect(readNotes(620)).toEqual({});
  });
});
