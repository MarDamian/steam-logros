import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  guideCoverage,
  mergeGuide,
  orderedChapters,
  parseGuidePack,
  pendingPointsOfNoReturn,
  safeParseGuidePack,
  type GuidePack,
  type MergeInput,
} from '../shared/guide';

const completo = parseGuidePack(
  JSON.parse(readFileSync(new URL('./fixtures/guides/2358720-completo.json', import.meta.url), 'utf8')),
);

function paquete(cambios: Partial<GuidePack> = {}): unknown {
  return {
    schemaVersion: 1,
    appid: 2358720,
    game: 'Juego',
    locale: 'es',
    updatedAt: '2026-10-20',
    chapters: [{ id: 'capitulo-1', order: 1, name: 'Capítulo 1' }],
    achievements: { A1: { type: 'historia', chapter: 'capitulo-1' } },
    pointsOfNoReturn: [],
    ...cambios,
  };
}

const logro = (apiName: string, extra: Partial<MergeInput> = {}): MergeInput => ({
  apiName,
  displayName: `Logro ${apiName}`,
  description: '',
  hidden: false,
  icon: '',
  iconGray: '',
  globalPercent: 50,
  unlocked: false,
  unlockTime: 0,
  ...extra,
});

describe('esquema del paquete de guía', () => {
  it('acepta un paquete bien armado', () => {
    expect(safeParseGuidePack(paquete()).success).toBe(true);
  });

  it('rechaza un capítulo que no está declarado', () => {
    const result = safeParseGuidePack(paquete({ achievements: { A1: { type: 'perdible', chapter: 'capitulo-9' } } }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('capitulo-9');
  });

  it('rechaza un punto de no retorno que no está declarado', () => {
    const result = safeParseGuidePack(
      paquete({ achievements: { A1: { type: 'perdible', pointOfNoReturn: 'inexistente' } } }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('inexistente');
  });

  it('rechaza bloquear un logro que el paquete no describe', () => {
    const result = safeParseGuidePack(
      paquete({
        pointsOfNoReturn: [
          { id: 'p1', chapter: 'capitulo-1', title: 'Punto', description: 'Descripción', locks: ['A1', 'A999'] },
        ],
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('A999');
  });

  it('rechaza ids repetidos', () => {
    const result = safeParseGuidePack(
      paquete({
        chapters: [
          { id: 'capitulo-1', order: 1, name: 'Uno' },
          { id: 'capitulo-1', order: 2, name: 'Otro' },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rechaza ids con formato raro, tipos inventados y versiones futuras', () => {
    expect(safeParseGuidePack(paquete({ chapters: [{ id: 'Capítulo 1', order: 1, name: 'x' }] })).success).toBe(false);
    expect(
      safeParseGuidePack(paquete({ achievements: { A1: { type: 'imposible-de-conseguir' } } } as never)).success,
    ).toBe(false);
    expect(safeParseGuidePack(paquete({ schemaVersion: 2 } as never)).success).toBe(false);
    expect(safeParseGuidePack(paquete({ updatedAt: '20 de octubre' })).success).toBe(false);
  });

  it('un punto de no retorno necesita bloquear al menos un logro', () => {
    const result = safeParseGuidePack(
      paquete({ pointsOfNoReturn: [{ id: 'p1', title: 'Punto', description: 'Descripción', locks: [] }] }),
    );
    expect(result.success).toBe(false);
  });
});

describe('mergeGuide', () => {
  it('sin paquete, todo queda sin clasificar y sin capítulo', () => {
    const [merged] = mergeGuide([logro('81001')], null);
    expect(merged?.type).toBe('sin-clasificar');
    expect(merged?.guide).toBeNull();
    expect(merged?.chapter).toBeNull();
  });

  it('pega tipo, capítulo y textos cuando el paquete los tiene', () => {
    const [merged] = mergeGuide([logro('81003')], completo);
    expect(merged?.type).toBe('perdible');
    expect(merged?.chapter?.name).toBe('Capítulo 1');
    expect(merged?.guide?.warning).toContain('no vuelve');
  });

  it('un logro que el paquete no menciona sigue apareciendo', () => {
    const [merged] = mergeGuide([logro('99999')], completo);
    expect(merged?.apiName).toBe('99999');
    expect(merged?.type).toBe('sin-clasificar');
  });

  it('manda Steam: un apiName que solo existe en el paquete no se inventa', () => {
    const merged = mergeGuide([logro('81001')], completo);
    expect(merged).toHaveLength(1);
    expect(merged.map((a) => a.apiName)).toEqual(['81001']);
  });

  it('un capítulo referenciado que no existe no rompe el merge', () => {
    // El esquema lo rechazaría, pero el merge no debe confiar en eso.
    const roto = { ...completo, chapters: [] } as GuidePack;
    const [merged] = mergeGuide([logro('81003')], roto);
    expect(merged?.type).toBe('perdible');
    expect(merged?.chapter).toBeNull();
  });
});

describe('orderedChapters', () => {
  it('ordena por el número de capítulo, no por el nombre', () => {
    expect(orderedChapters(completo).map((chapter) => chapter.id)).toEqual([
      'prologo',
      'capitulo-1',
      'capitulo-2',
      'capitulo-3',
    ]);
    expect(orderedChapters(null)).toEqual([]);
  });
});

describe('pendingPointsOfNoReturn', () => {
  it('avisa de lo que falta en un punto que todavía está por delante', () => {
    const warnings = pendingPointsOfNoReturn(completo, new Set(['81003']), 'prologo');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.point.id).toBe('fin-capitulo-1');
    expect(warnings[0]?.missing).toEqual(['81024']);
    expect(warnings[0]?.chapter?.name).toBe('Capítulo 1');
  });

  it('no avisa si ya están todos desbloqueados', () => {
    expect(pendingPointsOfNoReturn(completo, new Set(['81003', '81024']), 'prologo')).toEqual([]);
  });

  it('no avisa de un punto que ya quedó atrás', () => {
    expect(pendingPointsOfNoReturn(completo, new Set(), 'capitulo-3')).toEqual([]);
  });

  it('avisa del punto del capítulo en el que estás parado', () => {
    expect(pendingPointsOfNoReturn(completo, new Set(), 'capitulo-1')).toHaveLength(1);
  });

  it('sin capítulo declarado avisa de todo lo pendiente', () => {
    expect(pendingPointsOfNoReturn(completo, new Set(), null)).toHaveLength(1);
  });

  it('sin paquete no hay avisos', () => {
    expect(pendingPointsOfNoReturn(null, new Set(), null)).toEqual([]);
  });
});

describe('guideCoverage', () => {
  it('cuenta lo que el paquete de verdad cubre', () => {
    const coverage = guideCoverage(81, completo);
    expect(coverage).toEqual({ total: 81, classified: 5, withHow: 5, missable: 2 });
  });

  it('sin paquete, cobertura cero', () => {
    expect(guideCoverage(81, null)).toEqual({ total: 81, classified: 0, withHow: 0, missable: 0 });
  });
});
