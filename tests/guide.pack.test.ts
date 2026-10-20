import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGuidePack, safeParseGuidePack } from '../shared/guide';
import schemaEs from '../server/steam/fixtures/schema-2358720-spanish.json' with { type: 'json' };

const packFiles = readdirSync('games').filter((name) => /^\d+\.json$/.test(name));

describe('paquetes de guía del repo', () => {
  it('hay al menos uno', () => {
    expect(packFiles.length).toBeGreaterThan(0);
  });

  it.each(packFiles)('%s cumple el esquema y el appid coincide con el nombre', (file) => {
    const raw: unknown = JSON.parse(readFileSync(`games/${file}`, 'utf8'));
    const result = safeParseGuidePack(raw);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    expect(`${result.data?.appid}.json`).toBe(file);
  });
});

describe('paquete de Black Myth: Wukong', () => {
  const pack = parseGuidePack(JSON.parse(readFileSync('games/2358720.json', 'utf8')));
  const steamApiNames = new Set(schemaEs.game.availableGameStats.achievements.map((a) => a.name));

  it('cubre exactamente los 81 logros que tiene el juego en Steam', () => {
    expect(Object.keys(pack.achievements)).toHaveLength(81);
    for (const apiName of Object.keys(pack.achievements)) {
      expect(steamApiNames.has(apiName), `${apiName} no existe en Steam`).toBe(true);
    }
  });

  it('declara el prólogo y los seis capítulos, en orden', () => {
    expect(pack.chapters.map((chapter) => chapter.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('clasifica 19 logros y deja el resto explícitamente sin clasificar', () => {
    const tipos = Object.values(pack.achievements).map((entry) => entry.type);
    expect(tipos.filter((tipo) => tipo === 'sin-clasificar')).toHaveLength(62);
    expect(tipos.filter((tipo) => tipo !== 'sin-clasificar')).toHaveLength(19);
  });

  it('no inventa ningún aviso de perdible ni punto de no retorno', () => {
    // Un aviso equivocado es peor que ninguno: mientras no haya datos
    // verificados, el paquete no marca nada como perdible.
    expect(Object.values(pack.achievements).filter((entry) => entry.type === 'perdible')).toHaveLength(0);
    expect(pack.pointsOfNoReturn).toHaveLength(0);
  });

  it('dice de dónde salen los datos', () => {
    expect(pack.source?.url).toContain('steamcommunity.com');
    expect(pack.note).toBeTruthy();
  });
});

describe('games/index.json', () => {
  it('lista los mismos paquetes que hay en disco', () => {
    const index = JSON.parse(readFileSync('games/index.json', 'utf8')) as {
      guides: { appid: number; total: number; classified: number }[];
    };
    expect(index.guides.map((guide) => `${guide.appid}.json`).sort()).toEqual([...packFiles].sort());
    expect(index.guides.find((guide) => guide.appid === 2358720)).toMatchObject({ total: 81, classified: 19 });
  });
});
