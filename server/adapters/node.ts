/** Arranque para Node (desarrollo local, `npm start` y el Dockerfile). */
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync, readFileSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';
import { createApp } from '../app';

loadDotenv({ path: '.env', quiet: true });

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
