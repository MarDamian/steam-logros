/** Genera games/schema.json a partir del esquema de Zod de shared/guide.ts. */
import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { guidePackSchema } from '../shared/guide';

const jsonSchema = z.toJSONSchema(guidePackSchema, { io: 'input', target: 'draft-7' });

writeFileSync(
  'games/schema.json',
  `${JSON.stringify(
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Paquete de guía por juego',
      description:
        'Generado desde shared/guide.ts con `npm run guides:schema`. No editar a mano: el esquema de Zod es la fuente de verdad.',
      ...jsonSchema,
    },
    null,
    2,
  )}\n`,
);
console.log('games/schema.json escrito.');
