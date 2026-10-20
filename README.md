# Logros Steam

Rastreador de logros de Steam, multi-juego y en español. Entrás con tu SteamID,
ves tu biblioteca, abrís un juego y tenés todos sus logros con el porcentaje
global y el nivel de rareza.

> Proyecto independiente. No está afiliado a Valve, a Steam ni a ninguna
> desarrolladora de los juegos que muestra.

## Estado

| Fase | Qué incluye | Estado |
| --- | --- | --- |
| 1 | Esqueleto, API serverless, entrada por SteamID, biblioteca y vista de juego | listo |
| 2 | Login con OpenID 2.0 de Steam, sesión firmada y seguridad | pendiente |
| 3 | Capa de guía por juego (perdibles, capítulos) y notas | pendiente |
| 4 | PWA, exportar/importar, enlaces para compartir | pendiente |
| 5 | README completo, despliegue en un clic, CI | pendiente |

## Correrlo en local

```bash
npm install
cp .env.example .env
npm run dev          # frontend en :5173, API en :8787
```

Sin `STEAM_API_KEY` el servidor arranca en **modo fixtures**: responde con datos
locales de ejemplo (los 81 logros reales de Black Myth: Wukong y una biblioteca
inventada), así se puede desarrollar y correr las pruebas sin clave.

Para datos reales, sacá una clave en
[steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) y ponela
en `.env`:

```
STEAM_API_KEY=tu-clave
STEAM_MOCK=0
```

La clave vive **solo** en el servidor: no se envía al navegador ni aparece en
las respuestas de la API.

## Para que Steam muestre tus logros

Steam solo entrega logros de perfiles públicos. En
*Editar perfil → Configuración de privacidad* hay que poner en **Público**
tanto **Mi perfil** como **Detalles del juego**.

## Comandos

```bash
npm run dev        # desarrollo (Vite + API en Node)
npm run build      # compila el frontend a dist/client
npm start          # sirve frontend + API desde un solo proceso Node
npm run typecheck  # TypeScript estricto
npm run lint       # ESLint
npm test           # Vitest (no necesita clave de Steam)
```

## Estructura

```
src/          cliente React (rutas, componentes, i18n)
shared/       tipos y reglas que usan cliente y servidor
server/       API Hono portable + capa de Steam con validación Zod
  steam/      clientes por endpoint, esquemas Zod y modo fixtures
  cache/      CacheStore: memoria por defecto, KV de Cloudflare si existe
games/        paquetes de guía por appid (fase 3)
tests/        pruebas de API, de lógica y de interfaz en jsdom
```

## Licencia

MIT. Ver [LICENSE](LICENSE).
