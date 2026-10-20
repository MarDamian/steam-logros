/** Arranque para Node (desarrollo local, `npm start` y el Dockerfile). */
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync, readFileSync } from 'node:fs';
import { createApp } from '../app';

// Node trae lectura de .env desde la 20.6: no hace falta dotenv, y así el
// servidor se puede empaquetar a un solo archivo ESM sin requires dinámicos.
try {
  process.loadEnvFile('.env');
} catch {
  /* sin .env no pasa nada: las variables pueden venir del entorno */
}

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 8787);
const app = createApp();

// En producción el mismo proceso sirve el frontend compilado.
const clientDir = 'dist/client';
const indexPath = `${clientDir}/index.html`;
if (existsSync(indexPath)) {
  app.use('/*', serveStatic({ root: clientDir }));
  app.get('/*', (c) => c.html(readFileSync(indexPath, 'utf8')));
} else {
  app.get('/', (c) =>
    c.text('Solo la API está levantada. Para el frontend corré `npm run dev` o `npm run build`.', 200),
  );
}

serve({ fetch: app.fetch, port }, (info) => {
  const mode = process.env.STEAM_API_KEY ? 'con clave de Steam' : 'en modo fixtures (sin STEAM_API_KEY)';
  console.log(`API escuchando en http://127.0.0.1:${info.port} ${mode}`);
});
