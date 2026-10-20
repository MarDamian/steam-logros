/**
 * Genera games/2358720.json.
 *
 * Los nombres, descripciones, iconos y la marca de oculto salen de Steam. La
 * clasificación (historia / perdible / en cualquier momento / NG+), el capítulo
 * y el cómo conseguirlo son dato de comunidad: Steam no los tiene.
 *
 * La tabla de abajo va en el orden de los apiName (81001 a 81081), que es el
 * mismo en el que Steam devuelve los logros. Los textos están escritos de cero:
 * los requisitos de un juego son hechos, pero la redacción de cada guía es de
 * quien la escribió.
 */
import { writeFileSync } from 'node:fs';
import schemaEs from '../server/steam/fixtures/schema-2358720-spanish.json' with { type: 'json' };
import type { AchievementType, GuidePack } from '../shared/guide';
import { parseGuidePack } from '../shared/guide';

const APPID = 2358720;

/** [apiName, tipo, capítulo o '', cómo conseguirlo, aviso o '', punto de no retorno o ''] */
type Fila = [string, AchievementType, string, string, string, string];

const PROLOGO = 'prologo';
const C1 = 'capitulo-1';
const C2 = 'capitulo-2';
const C3 = 'capitulo-3';
const C4 = 'capitulo-4';
const C5 = 'capitulo-5';
const C6 = 'capitulo-6';

const DUSKVEIL = 'pelea-duskveil';
const APRAMANA = 'avance-capitulo-3';
const GUARDIAN = 'guardian-montana-llameante';
const INSPECTOR = 'segundo-encuentro-inspector';
const PERDIBLES_SUELTOS = 'espiritus-y-objetos-perdibles';

const FILAS: Fila[] = [
  ['81001', 'historia', PROLOGO, 'Terminá el prólogo: vencé a Erlang y mirá la cinemática de apertura.', '', ''],
  ['81002', 'cualquier-momento', '', 'Forjá cualquier pieza de armadura.', '', ''],
  ['81003', 'historia', C1, 'Vencé a Lingxuzi.', '', ''],
  ['81004', 'cualquier-momento', '', 'Absorbé el espíritu de un enemigo.', '', ''],
  ['81005', 'cualquier-momento', '', 'Equipá un remojo en la calabaza.', '', ''],
  ['81006', 'historia', C1, 'Vencé al Noble de Blanco.', '', ''],
  ['81007', 'cualquier-momento', '', 'Forjá cualquier arma.', '', ''],
  ['81008', 'cualquier-momento', C1, 'Tocá las tres campanas del Capítulo 1 para descubrir el Templo Guanyin antiguo.', '', ''],
  ['81009', 'cualquier-momento', C1, 'Vencé al Anciano Jinchi, en el Templo Guanyin antiguo.', '', ''],
  ['81010', 'historia', C1, 'Vencé al Rey del Viento Negro, el jefe final del Capítulo 1.', '', ''],
  ['81011', 'cualquier-momento', '', 'Preparate cualquier consumible.', '', ''],
  ['81012', 'cualquier-momento', '', 'Vencé al Rey de las Arenas Movedizas y a los dos Príncipes Rata. El Primer Príncipe es un jefe opcional.', '', ''],
  ['81013', 'cualquier-momento', C1, 'Vencé al Loong Rojo, escondido detrás de la cascada del Capítulo 1.', '', ''],
  ['81014', 'cualquier-momento', C2, 'Completá la misión del hombre de piedra del Capítulo 2.', '', ''],
  ['81015', 'cualquier-momento', C2, 'Vencé al Loong Negro, detrás de la cortina de arena del Capítulo 2.', '', ''],
  ['81016', 'historia', '', 'Vencé a la Vanguardia de Piedra.', '', ''],
  ['81017', 'cualquier-momento', '', 'Juntá todos los ojos de Buda, usalos para abrir la pelea contra Shigandang y vencelo.', '', ''],
  ['81018', 'cualquier-momento', '', 'Completá la línea del tambor y vencé al Tigre Demente.', '', ''],
  ['81019', 'cualquier-momento', '', 'Completá la línea del Jabalí Borracho y llegá al Reino de Sahali.', '', ''],
  ['81020', 'cualquier-momento', '', 'Vencé a la Vanguardia Tigre, a su versión del recuerdo en el Reino de Sahali y al Tigre Demente.', '', ''],
  ['81021', 'cualquier-momento', '', 'Vencé a Fuban, el jefe del Reino de Sahali.', '', ''],
  ['81022', 'cualquier-momento', '', 'Forjá una píldora con el perro Xu.', '', ''],
  ['81023', 'historia', C2, 'Vencé al Sabio del Viento Amarillo, el jefe final del Capítulo 2.', '', ''],
  ['81024', 'cualquier-momento', '', 'Completá la línea del prisionero rata de dos cabezas.', '', ''],
  ['81025', 'historia', '', 'Vencé al Capitán Voz Sabia.', '', ''],
  ['81026', 'historia', '', 'Vencé a la Estrella Kang-Jin.', '', ''],
  ['81027', 'cualquier-momento', '', 'Vencé al Loong Cian.', '', ''],
  [
    '81028',
    'perdible',
    C3,
    'Completá la línea del General Tortuga y el General Serpiente: vencé al Murciélago Apramana y quedate con la Lágrima de Tortuga.',
    'El Murciélago Apramana puede desaparecer al avanzar en el Capítulo 3. Hacelo antes de seguir.',
    APRAMANA,
  ],
  ['81029', 'cualquier-momento', '', 'Completá la línea de Chen Loong y conseguí el Pergamino Ruyi.', '', ''],
  ['81030', 'cualquier-momento', '', 'Mejorá una pieza de armadura con el Tigre Yin, dentro del Pergamino Ruyi.', '', ''],
  ['81031', 'cualquier-momento', '', 'Desafiá al Tigre Yin y vencelo.', '', ''],
  ['81032', 'cualquier-momento', '', 'Dale una semilla a Chen Loong y levantá una cosecha.', '', ''],
  ['81033', 'cualquier-momento', C3, 'Completá la misión del cazador de tesoros del Capítulo 3 y encontrate con el verdadero Maitreya.', '', ''],
  ['81034', 'cualquier-momento', C3, 'Completá la misión de la zorra del Capítulo 3.', '', ''],
  ['81035', 'cualquier-momento', '', 'Completá la misión del Tercer Príncipe juntando las cuatro almas de sus capitanes.', '', ''],
  ['81036', 'cualquier-momento', '', 'Vencé a los cuatro discípulos de Cejas Amarillas.', '', ''],
  ['81037', 'historia', '', 'Vencé al Macaco Jefe en los tres encuentros.', '', ''],
  ['81038', 'historia', C3, 'Vencé a Cejas Amarillas, el jefe final del Capítulo 3.', '', ''],
  ['81039', 'historia', '', 'Vencé a la Mano Derecha de Buda.', '', ''],
  ['81040', 'historia', '', 'Vencé a Zhu Bajie en los dos encuentros.', '', ''],
  ['81041', 'historia', '', 'Vencé a la Araña Violeta.', '', ''],
  ['81042', 'cualquier-momento', '', 'Vencé al Loong Amarillo.', '', ''],
  ['81043', 'cualquier-momento', '', 'Vencé al Daoísta Veneno en los dos encuentros y abrí la Montaña de las Nubes Moradas.', '', ''],
  [
    '81044',
    'perdible',
    C4,
    'Completá toda la línea del Daoísta Mi.',
    'La pelea contra Duskveil cierra esta línea para siempre en esta partida. No peleés a Duskveil hasta terminarla.',
    DUSKVEIL,
  ],
  [
    '81045',
    'perdible',
    C4,
    'Vencé al Señor Escorpión y a sus cuatro príncipes escorpión.',
    'El Señor Escorpión desaparece al pelear contra Duskveil.',
    DUSKVEIL,
  ],
  [
    '81046',
    'cualquier-momento',
    C4,
    'Vencé a Duskveil.',
    'Antes de pelearlo, cerrá la línea del Daoísta Mi y vencé al Señor Escorpión: después ya no se puede.',
    '',
  ],
  [
    '81047',
    'perdible',
    C4,
    'Completá la línea de la Cuarta Hermana: arrancá los cuatro talismanes morados y vencé al Inspector Supremo en el primer encuentro.',
    'Si llegás al segundo encuentro con el Inspector Supremo sin haberla cerrado, se pierde.',
    INSPECTOR,
  ],
  ['81048', 'historia', C4, 'Vencé al Maestro Daoísta de los Cien Ojos, el jefe final del Capítulo 4.', '', ''],
  ['81049', 'cualquier-momento', C5, 'Subí la calabaza inicial al máximo y después hablá con el anciano de la calabaza gigante, en el Capítulo 5.', '', ''],
  ['81050', 'historia', C5, 'Vencé al Guardián de la Montaña Llameante.', '', ''],
  [
    '81051',
    'perdible',
    C5,
    'Hablá con el guai del caballo en cada capítulo y, recién al final, vencé al Guardián de la Montaña Llameante y quedate con su transformación.',
    'Si lo salteás en algún capítulo, o vencés al Guardián antes de cerrar la línea, se pierde.',
    GUARDIAN,
  ],
  ['81052', 'cualquier-momento', '', 'Juntá las 15 semillas para el huerto de Chen Loong.', '', ''],
  ['81053', 'cualquier-momento', '', 'Vencé a los cinco jefes de plantas.', '', ''],
  ['81054', 'cualquier-momento', '', 'Completá la línea del Hacha Pálida y abrí la Cueva Bishui.', '', ''],
  ['81055', 'cualquier-momento', '', 'Descubrí todos los puntos de meditación.', '', ''],
  ['81056', 'cualquier-momento', '', 'Vencé a los tres jefes que pelean siempre de a dos.', '', ''],
  [
    '81057',
    'perdible',
    '',
    'Juntá todos los espíritus.',
    'Dos son perdibles: el Espectro Errante y el Segundo Príncipe de las Arenas Movedizas.',
    PERDIBLES_SUELTOS,
  ],
  ['81058', 'cualquier-momento', '', 'Vencé a la Bestia de Ojos Dorados de Bishui.', '', ''],
  ['81059', 'historia', C5, 'Vencé al Niño Rojo, el jefe final del Capítulo 5.', '', ''],
  ['81060', 'cualquier-momento', '', 'Juntá las cuatro vasijas: el manto ignífugo (Cap. 1), el domavientos (Cap. 2), la aguja (Cap. 4) y el abanico de plátano (Cap. 5).', '', ''],
  ['81061', 'cualquier-momento', '', 'Entrá al Monte Mei. Hacen falta las zonas secretas de los Capítulos 1 a 5 y hablar con Maitreya en la Gran Pagoda del Capítulo 3.', '', ''],
  ['81062', 'cualquier-momento', '', 'Vencé a Erlang y a los Cuatro Reyes Celestiales en el Monte Mei. Es el camino al final secreto.', '', ''],
  [
    '81063',
    'perdible',
    '',
    'Conseguí las diez transformaciones.',
    'Dos dependen de líneas perdibles: Granizo Violeta viene de la del Daoísta Mi y Trueno Oscuro de la del guai del caballo.',
    DUSKVEIL,
  ],
  ['81064', 'cualquier-momento', '', 'Conseguí las nueve bebidas.', '', ''],
  ['81065', 'historia', C6, 'En el Capítulo 6, vencé al Inspector Supremo en el segundo encuentro y quedate con el nimbo.', '', ''],
  ['81066', 'cualquier-momento', '', 'Vencé a los seis jefes rana repartidos por el juego.', '', ''],
  [
    '81067',
    'perdible',
    '',
    'Juntá todas las curiosidades.',
    'Dos son perdibles: las cuentas de ojo de gato, que las deja el Espectro Errante, y el farol auspicioso, que sale de matar a los nueve faroleros.',
    PERDIBLES_SUELTOS,
  ],
  ['81068', 'cualquier-momento', '', 'Juntá los cinco skandhas y entregalos al perro Xu.', '', ''],
  ['81069', 'cualquier-momento', '', 'Juntá todas las píldoras doradas de salud, resistencia y maná que hay en cada mapa.', '', ''],
  ['81070', 'cualquier-momento', C6, 'Vencé a los seis jefes del Monte Huaguo.', '', ''],
  ['81071', 'historia', C6, 'Conseguí las cuatro piezas de la armadura de Wukong venciendo a cuatro jefes del Capítulo 6.', '', ''],
  ['81072', 'historia', C6, 'Vencé al Gran Sabio de Casco Roto, el jefe final del juego.', '', ''],
  [
    '81073',
    'perdible',
    '',
    'Completá todos los retratos del diario.',
    'Dos entradas son perdibles: el Murciélago Apramana y el Señor Escorpión.',
    APRAMANA,
  ],
  ['81074', 'ng+', '', 'Entrá en NG+.', '', ''],
  ['81075', 'ng+', '', 'Aprendé los siete hechizos. El Hilo Salvavidas se aprende solo al entrar en NG+.', '', ''],
  ['81076', 'ng+', '', 'Juntá todas las calabazas. Una solo la vende el mono Shen en NG+.', '', ''],
  ['81077', 'ng+', '', 'Juntá todas las fórmulas. Una solo la vende el perro Xu en NG+.', '', ''],
  [
    '81078',
    'perdible',
    '',
    'Juntá todos los remojos. Uno solo lo vende el mono Shen en NG+.',
    'La Lágrima de Tortuga es perdible, así que este logro depende de que hayas cerrado la línea del General Tortuga a tiempo.',
    '',
  ],
  ['81079', 'ng+', '', 'Conseguí todas las piezas de armadura. Los materiales de algunas solo aparecen en NG+.', '', ''],
  ['81080', 'ng+', '', 'Conseguí todas las armas. Algunas solo se pueden forjar en NG+.', '', ''],
  [
    '81081',
    'perdible',
    '',
    'Conseguí todos los demás logros, incluidos los de NG+.',
    'Depende de todos los perdibles: si se te escapa uno, este se va con él en esta partida.',
    '',
  ],
];

const achievements = schemaEs.game.availableGameStats.achievements;
const apiNames = achievements.map((achievement) => achievement.name);

// La tabla va por posición, así que el orden tiene que coincidir con Steam.
if (FILAS.length !== apiNames.length) {
  throw new Error(`La tabla tiene ${FILAS.length} filas y Steam devuelve ${apiNames.length} logros.`);
}
FILAS.forEach((fila, indice) => {
  if (fila[0] !== apiNames[indice]) {
    throw new Error(`Fila ${indice}: la tabla dice ${fila[0]} y Steam dice ${apiNames[indice]}.`);
  }
});

const entries: GuidePack['achievements'] = {};
for (const [apiName, type, chapter, how, warning, pointOfNoReturn] of FILAS) {
  entries[apiName] = {
    type,
    ...(chapter === '' ? {} : { chapter }),
    how,
    ...(warning === '' ? {} : { warning }),
    ...(pointOfNoReturn === '' ? {} : { pointOfNoReturn }),
  };
}

const pack: GuidePack = {
  schemaVersion: 1,
  appid: APPID,
  game: 'Black Myth: Wukong',
  locale: 'es',
  updatedAt: '2026-10-20',
  source: {
    name: 'Clasificación y requisitos de una guía de la comunidad, reescritos; nombres y porcentajes, de Steam',
    url: 'https://steamcommunity.com/stats/2358720/achievements/',
  },
  note:
    'Los 81 logros están clasificados. Steam no sabe nada de capítulos ni de logros que se pueden ' +
    'perder: eso viene de una guía de la comunidad, con los textos reescritos. Los nombres, las ' +
    'descripciones y los porcentajes globales sí salen de la API de Steam.',
  chapters: [
    { id: PROLOGO, order: 0, name: 'Prólogo' },
    { id: C1, order: 1, name: 'Capítulo 1' },
    { id: C2, order: 2, name: 'Capítulo 2' },
    { id: C3, order: 3, name: 'Capítulo 3' },
    { id: C4, order: 4, name: 'Capítulo 4' },
    { id: C5, order: 5, name: 'Capítulo 5' },
    { id: C6, order: 6, name: 'Capítulo 6' },
  ],
  achievements: entries,
  pointsOfNoReturn: [
    {
      id: APRAMANA,
      chapter: C3,
      title: 'Avanzar en el Capítulo 3',
      description:
        'El Murciélago Apramana puede desaparecer al avanzar en el capítulo, y con él la Lágrima de Tortuga y su entrada del diario.',
      locks: ['81028', '81073'],
    },
    {
      id: DUSKVEIL,
      chapter: C4,
      title: 'Pelear contra Duskveil',
      description:
        'Esa pelea cierra la línea del Daoísta Mi y hace desaparecer al Señor Escorpión. Cerrá las dos cosas antes de ir.',
      locks: ['81044', '81045', '81063', '81073'],
    },
    {
      id: GUARDIAN,
      chapter: C5,
      title: 'Vencer al Guardián de la Montaña Llameante',
      description:
        'La línea del guai del caballo necesita que hables con él en cada capítulo y recién después vencer al Guardián. Al revés, se pierde la transformación.',
      locks: ['81051', '81063'],
    },
    {
      id: INSPECTOR,
      chapter: C6,
      title: 'Segundo encuentro con el Inspector Supremo',
      description:
        'La línea de la Cuarta Hermana se cierra en el primer encuentro. Si llegás al segundo sin haberla completado, queda fuera de alcance.',
      locks: ['81047'],
    },
    {
      id: PERDIBLES_SUELTOS,
      title: 'Enemigos que no vuelven a aparecer',
      description:
        'El Espectro Errante, el Segundo Príncipe de las Arenas Movedizas y los nueve faroleros dejan objetos y espíritus que no se consiguen de otra forma.',
      locks: ['81057', '81067'],
    },
  ],
};

parseGuidePack(pack);
writeFileSync(`games/${APPID}.json`, `${JSON.stringify(pack, null, 2)}\n`);

const cuenta = (tipo: AchievementType) => Object.values(entries).filter((entry) => entry.type === tipo).length;
console.log(`games/${APPID}.json escrito: ${achievements.length} logros.`);
console.log(
  `  historia ${cuenta('historia')} | perdible ${cuenta('perdible')} | ` +
    `cualquier-momento ${cuenta('cualquier-momento')} | ng+ ${cuenta('ng+')} | sin clasificar ${cuenta('sin-clasificar')}`,
);
console.log(`  puntos de no retorno: ${pack.pointsOfNoReturn.length}`);
