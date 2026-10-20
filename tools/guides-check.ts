/**
 * Valida todos los paquetes de guía y regenera games/index.json.
 * Corre en CI: un paquete inválido no entra al repo.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { safeParseGuidePack } from '../shared/guide';

const DIR = 'games';
const files = readdirSync(DIR)
  .filter((name) => /^\d+\.json$/.test(name))
  .sort();

let errores = 0;
const index: { appid: number; game: string; locale: string; updatedAt: string; classified: number; total: number }[] = [];

for (const file of files) {
  const raw: unknown = JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8'));
  const result = safeParseGuidePack(raw);

  if (!result.success) {
    errores += 1;
    console.error(`\n✗ ${DIR}/${file}`);
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.') || '(raíz)'}: ${issue.message}`);
    }
    continue;
  }

  const pack = result.data;
  const esperado = `${pack.appid}.json`;
  if (esperado !== file) {
    errores += 1;
    console.error(`✗ ${DIR}/${file}: el appid de dentro (${pack.appid}) no coincide con el nombre del archivo`);
    continue;
  }

  const entries = Object.values(pack.achievements);
  const classified = entries.filter((entry) => entry.type !== 'sin-clasificar').length;
  index.push({
    appid: pack.appid,
    game: pack.game,
    locale: pack.locale,
    updatedAt: pack.updatedAt,
    classified,
    total: entries.length,
  });
  console.log(`✓ ${DIR}/${file}: ${pack.game}, ${classified}/${entries.length} clasificados`);
}

if (errores > 0) {
  console.error(`\n${errores} paquete(s) con problemas.`);
  process.exit(1);
}

writeFileSync(`${DIR}/index.json`, `${JSON.stringify({ guides: index }, null, 2)}\n`);
console.log(`\n${index.length} paquete(s) válidos. games/index.json actualizado.`);
