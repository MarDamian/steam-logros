/**
 * Genera games/2358720.json a partir de lo que de verdad devuelve la API de Steam.
 *
 * Criterio, explícito a propósito: Steam no sabe nada de capítulos ni de logros
 * que se pueden perder, así que acá solo se clasifica lo que se puede defender
 * mirando los datos de Steam. Todo lo demás queda como `sin-clasificar`, que es
 * un estado válido del esquema, no un hueco. Preferimos un paquete incompleto a
 * un aviso de "perdible" inventado: un aviso equivocado es peor que ninguno.
 */
import { writeFileSync } from 'node:fs';
import schemaEs from '../server/steam/fixtures/schema-2358720-spanish.json' with { type: 'json' };
import type { GuidePack } from '../shared/guide';
import { parseGuidePack } from '../shared/guide';

const APPID = 2358720;

/** Único logro no oculto que es de historia: cierra el prólogo. */
const HISTORIA = new Set(['81001']);

const achievements = schemaEs.game.availableGameStats.achievements;

const entries: GuidePack['achievements'] = {};
for (const achievement of achievements) {
  if (HISTORIA.has(achievement.name)) {
    entries[achievement.name] = { type: 'historia', chapter: 'prologo' };
    continue;
  }
  // Los logros que Steam NO esconde son, en este juego, los acumulativos de
  // colección y mejora: se van sumando y no dependen de un momento concreto.
  if (achievement.hidden === 0) {
    entries[achievement.name] = { type: 'cualquier-momento' };
    continue;
  }
  entries[achievement.name] = { type: 'sin-clasificar' };
}

const pack: GuidePack = {
  schemaVersion: 1,
  appid: APPID,
  game: 'Black Myth: Wukong',
  locale: 'es',
  updatedAt: '2026-10-20',
  source: {
    name: 'Lista oficial de logros de Steam',
    url: 'https://steamcommunity.com/stats/2358720/achievements/',
  },
  note:
    'Paquete incompleto a propósito. Los 19 logros clasificados salen de datos de Steam: ' +
    'el que cierra el prólogo es de historia y los que Steam no esconde son los acumulativos ' +
    'de colección y mejora. Los 62 logros ocultos quedan sin clasificar porque decidir si uno ' +
    'se puede perder, y en qué capítulo, es dato de comunidad: la API de Steam no lo tiene. ' +
    'En CONTRIBUTING.md está cómo completarlo.',
  chapters: [
    { id: 'prologo', order: 0, name: 'Prólogo' },
    { id: 'capitulo-1', order: 1, name: 'Capítulo 1' },
    { id: 'capitulo-2', order: 2, name: 'Capítulo 2' },
    { id: 'capitulo-3', order: 3, name: 'Capítulo 3' },
    { id: 'capitulo-4', order: 4, name: 'Capítulo 4' },
    { id: 'capitulo-5', order: 5, name: 'Capítulo 5' },
    { id: 'capitulo-6', order: 6, name: 'Capítulo 6' },
  ],
  achievements: entries,
  // Vacío mientras no haya datos verificados. El panel de avisos se dibuja solo
  // cuando hay algo real que avisar.
  pointsOfNoReturn: [],
};

parseGuidePack(pack);
writeFileSync(`games/${APPID}.json`, `${JSON.stringify(pack, null, 2)}\n`);

const total = achievements.length;
const clasificados = Object.values(entries).filter((entry) => entry.type !== 'sin-clasificar').length;
console.log(`games/${APPID}.json escrito: ${clasificados} de ${total} logros clasificados.`);
