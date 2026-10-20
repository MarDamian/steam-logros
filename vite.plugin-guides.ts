import { readFileSync, readdirSync } from 'node:fs';
import type { Plugin } from 'vite';

const DIR = 'games';

function guideFiles(): string[] {
  return readdirSync(DIR).filter((name) => name.endsWith('.json'));
}

/**
 * Los paquetes de guía viven en games/ y se sirven como archivos estáticos en
 * /games/. No llevan secretos ni dependen de quién pregunta, así que los puede
 * cachear el CDN y el servidor no hace nada. En desarrollo los sirve Vite; en
 * producción salen dentro de dist/client y los sirve el mismo estático de siempre.
 */
export function guidePacksPlugin(): Plugin {
  return {
    name: 'paquetes-de-guia',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/games/')) return next();
        const name = url.slice('/games/'.length).split('?')[0] ?? '';
        if (!/^[\w.-]+\.json$/.test(name) || !guideFiles().includes(name)) {
          res.statusCode = 404;
          res.end('{"error":"no hay paquete de guía para esto"}');
          return;
        }
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(readFileSync(`${DIR}/${name}`));
      });
    },

    buildStart() {
      for (const name of guideFiles()) {
        this.emitFile({
          type: 'asset',
          fileName: `games/${name}`,
          source: readFileSync(`${DIR}/${name}`, 'utf8'),
        });
      }
    },
  };
}
