# Logros Steam

Rastreador de logros de Steam, multi-juego y en español. Entrás con Steam o
pegás tu SteamID, ves tu biblioteca, abrís un juego y tenés todos sus logros con
la fecha de desbloqueo, el porcentaje global de jugadores que los tiene y su
nivel de rareza. Se instala en el celular como app.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/MarDamian/steam-logros)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMarDamian%2Fsteam-logros&env=STEAM_API_KEY,SESSION_SECRET,PUBLIC_BASE_URL&envDescription=STEAM_API_KEY%20se%20saca%20en%20steamcommunity.com%2Fdev%2Fapikey.%20SESSION_SECRET%3A%20openssl%20rand%20-hex%2032.%20PUBLIC_BASE_URL%3A%20la%20URL%20final%2C%20sin%20barra.&envLink=https%3A%2F%2Fgithub.com%2FMarDamian%2Fsteam-logros%23variables-de-entorno&project-name=steam-logros&repository-name=steam-logros)

> Proyecto independiente. **No está afiliado a Valve, a Steam, a Game Science ni
> a ninguna desarrolladora de los juegos que muestra.** Los datos de logros
> salen de la Web API pública de Steam; las guías las escribe la comunidad.

## Qué hace

- **Entrar**: botón "Entrar con Steam" (OpenID 2.0), o pegar un SteamID64, una
  URL `/profiles/…` o una URL personalizada `/id/…`. También hay modo demo.
- **Biblioteca**: búsqueda, orden por nombre, tiempo jugado, % de completado y
  "más cerca del 100%", y filtro de juegos con logros.
- **Vista de juego**: icono, nombre, descripción, fecha de desbloqueo, %
  global y nivel de rareza de cada logro. Maneja los logros ocultos. Filtros
  por estado y rareza, orden "más fácil primero" y búsqueda.
- **Capa de guía** por juego: tipo (historia / se puede perder / en cualquier
  momento / nueva partida+), capítulo, cómo conseguirlo, avisos, y el panel
  **Cuidado: puntos de no retorno**.
- **Notas propias** por logro y marca de "resuelto por mí", con exportar e
  importar en JSON.
- **Instalable** (PWA) y con enlaces de solo lectura para compartir progreso.

## Despliegue en 5 minutos

### 1. Sacá la clave de Steam (1 minuto)

Entrá a [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
con tu cuenta de Steam. Pide un **dominio**: poné el dominio donde va a vivir la
app (`mis-logros.pages.dev`, `mis-logros.vercel.app`, el tuyo…). El dominio es
solo informativo para Valve; la clave funciona igual desde cualquier lado.

Copiá la clave. **No la pegues en ningún archivo del repo**: solo va como
variable de entorno del servidor.

### 2. Generá el secreto de sesión (10 segundos)

```bash
openssl rand -hex 32
```

### 3. Apretá el botón

Con el botón de **Deploy to Cloudflare**: te clona el repo y te pide los tres
valores. No hace falta crear ningún recurso: la caché de las respuestas de Steam
arranca en memoria.

Si después querés que la caché sobreviva entre peticiones (menos llamadas a
Steam y un límite por IP que no se reinicia), agregale un KV desde el panel —
**Settings → Bindings → Add → KV namespace**, con el nombre de binding `CACHE`.
No hay que tocar código: el servidor detecta el binding en tiempo de ejecución.

Con el de **Vercel**: igual, te pide los tres valores en el formulario.

En los dos casos, `PUBLIC_BASE_URL` tiene que ser la URL final **sin barra al
final** (`https://mis-logros.pages.dev`). Si todavía no sabés cuál va a ser,
desplegá, mirá la URL que te dio la plataforma y corregí la variable: es un
cambio de un minuto, pero hay que hacerlo o el login de Steam falla a propósito.

### 4. Poné tu perfil de Steam en público

Steam solo entrega logros de perfiles públicos. En Steam:
**Editar perfil → Configuración de privacidad**, y poné en **Público**:

- **Mi perfil**
- **Detalles del juego** ← sin esto no hay logros, aunque el perfil sea público

La app, si se topa con un perfil privado, te lo explica con estos mismos pasos.

## Variables de entorno

| Variable | ¿Hace falta? | Para qué |
| --- | --- | --- |
| `STEAM_API_KEY` | sí, para datos reales | Hablar con la Web API de Steam. Solo existe en el servidor. |
| `SESSION_SECRET` | sí, para el login | Firmar la cookie de sesión (HMAC-SHA256). `openssl rand -hex 32`. |
| `PUBLIC_BASE_URL` | sí, para el login | URL pública sin barra final. De ahí salen el `return_to` y el `realm` del login, y contra ella se valida la respuesta de Steam. |
| `DEMO_STEAMID` | no | SteamID64 público para el modo demo. |
| `DEFAULT_STEAM_LANGUAGE` | no | `spanish` (por defecto) o `english`. |
| `STEAM_MOCK` | no | `1` para responder con fixtures locales en vez de llamar a Steam. |

Sin `STEAM_API_KEY` la app no se rompe: arranca en **modo fixtures** y lo avisa
en pantalla. Sin `SESSION_SECRET` o `PUBLIC_BASE_URL`, el botón de login queda
deshabilitado y lo explica, pero pegar un SteamID sigue funcionando.

## Correrlo en local

```bash
npm install
cp .env.example .env
npm run dev          # frontend en :5173, API en :8787
```

Así, sin tocar nada más, arranca en modo fixtures: datos locales de ejemplo con
los 81 logros reales de Black Myth: Wukong. Para datos reales, poné tu clave en
`.env` y `STEAM_MOCK=0`.

```bash
npm run build && npm start    # un solo proceso Node sirve frontend y API
docker build -t steam-logros . && docker run -p 8787:8787 --env-file .env steam-logros
npx wrangler dev              # en el runtime de Cloudflare Workers
```

`npm run build` hace dos cosas: compila el frontend a `dist/client` y empaqueta
el servidor en un único `dist/server/node.mjs`. Por eso la imagen de Docker no
necesita `node_modules` y pesa lo que pesa la base de Alpine.

## Login con Steam

Es OpenID 2.0, el único mecanismo que ofrece Valve. **Solo identifica a la
persona**: Steam no entrega contraseña, correo ni permiso alguno sobre la
cuenta. La interfaz lo dice al lado del botón.

Qué hace el servidor con la respuesta de Steam, en este orden:

1. Comprueba `mode=id_res`, el namespace de OpenID 2.0 y que el `op_endpoint`
   sea exactamente `https://steamcommunity.com/openid/login`.
2. Exige que `claimed_id` sea `https://steamcommunity.com/openid/id/<17 dígitos>`
   y que `identity` apunte al mismo.
3. Exige que `return_to` sea exactamente el nuestro, derivado de
   `PUBLIC_BASE_URL`.
4. Exige que la firma cubra `claimed_id`, `identity`, `return_to`,
   `response_nonce` y `op_endpoint`.
5. Rechaza nonces de más de 10 minutos y nonces ya usados.
6. Y recién entonces le pregunta a Steam con `check_authentication`. Sin un
   `is_valid:true` no hay sesión.

La sesión es una cookie `httpOnly`, `SameSite=Lax`, `Secure` en https, firmada
con HMAC-SHA256 por Web Crypto. No hay base de datos ni estado en el servidor.

## Seguridad

- `STEAM_API_KEY` solo existe como variable de entorno del servidor. No llega al
  navegador, ni a los logs, ni a los mensajes de error. Hay una prueba que lo
  verifica.
- El proxy expone **una lista cerrada** de endpoints. No hay proxy abierto:
  cualquier otra ruta bajo `/api` devuelve 404. `appid` tiene que ser numérico y
  `steamid` tiene que tener 17 dígitos.
- Límite por IP: 120 peticiones por minuto en general, 20 cada 5 minutos en el
  login. El lote de progreso acepta como máximo 12 juegos por petición y hace
  como máximo 4 llamadas simultáneas a Steam.
- Sin analítica y sin rastreo. Las notas no salen del dispositivo.

## Qué sabe Steam y qué no

`GetSchemaForGame` da nombre, descripción, icono y si el logro está oculto.
`GetGlobalAchievementPercentagesForApp` (que no necesita clave) da el porcentaje
global. **Nada más.** Steam no tiene idea de capítulos, de logros que se pueden
perder ni de cómo conseguir cada cosa: eso es dato de comunidad y vive en
`games/<appid>.json`.

Si un juego no tiene paquete de guía, funciona igual con los datos de Steam.
Cuando lo tiene, la vista añade tipo y capítulo por logro, cómo conseguirlo, el
aviso, filtros por tipo y capítulo, un selector de "¿en qué capítulo vas?" que
se recuerda por juego, y el panel **Cuidado: puntos de no retorno**, que lista
solo los logros que todavía te faltan de cada punto que tengas por delante.

El paquete que viene en el repo, `games/2358720.json` (Black Myth: Wukong),
tiene **los 81 logros clasificados**: 19 de historia, 45 que se pueden hacer en
cualquier momento, 11 que se pueden perder y 6 que piden NG+. Y declara **cinco
puntos de no retorno** — pelear contra Duskveil, avanzar en el Capítulo 3,
vencer al Guardián de la Montaña Llameante, llegar al segundo encuentro con el
Inspector Supremo, y los enemigos que no vuelven a aparecer.

Los nombres, las descripciones y los porcentajes salen de la API de Steam. La
clasificación y los requisitos vienen de una guía de la comunidad, **con los
textos reescritos**: los requisitos de un juego son hechos, pero la redacción de
cada guía es de quien la escribió. El paquete declara su procedencia en el campo
`source` y la interfaz la muestra.

El esquema admite `sin-clasificar` como estado válido justamente para que un
paquete a medias sirva: la interfaz dice cuántos logros están clasificados y
avisa de que el resto es dato de comunidad. En
[CONTRIBUTING.md](CONTRIBUTING.md) está cómo añadir un paquete para otro juego.

### Por qué la biblioteca carga el progreso de a poco

`GetOwnedGames` no devuelve el conteo de logros. Para saber el progreso de un
juego hay que preguntar por ese juego. Con 300 juegos serían 300 llamadas, así
que el progreso se pide **solo de las tarjetas que entran en pantalla**, en
lotes de 12, con un máximo de 4 llamadas simultáneas a Steam y caché con TTL.
Por eso los órdenes por "% de completado" y "más cerca del 100%" usan lo que ya
se cargó, y hay un botón para calcular el resto de una vez.

## Instalable en el celular

`manifest.webmanifest` con iconos de 192, 512 y uno *maskable*, y un service
worker propio (`public/sw.js`, sin librerías) con tres estrategias: navegación
por red con el `index.html` cacheado de respaldo (por eso abre sin conexión);
**caché primero solo para `/assets/`**, que es lo único que lleva hash en el
nombre y por lo tanto nunca cambia de contenido; y red primero con respaldo
cacheado para todo el resto — la API, los iconos y los paquetes de guía —,
marcando la copia vieja con la cabecera `x-logros-cache: viejo`. Las rutas de
login nunca pasan por el service worker.

Esa distinción no es teórica: `games/<appid>.json` no lleva hash, y servirlo con
caché primero dejaba a los navegadores pegados al paquete de guía viejo para
siempre. `tests/sw.test.ts` ejecuta el service worker con globales simulados y
comprueba qué estrategia le toca a cada ruta.

## Tus datos

Las notas, las marcas propias y el capítulo en el que vas se guardan en
`localStorage`. No hay servidor donde queden copiados, así que en **Mis datos**
(`/datos`) están el exportar a JSON y el importar, con dos modos: *mezclar*
(gana la nota más reciente de cada logro) o *reemplazar* lo que haya de cada
juego. También está el borrado total.

`/u/<steamid>` y `/u/<steamid>/<appid>` son direcciones públicas de solo
lectura: no necesitan sesión. El botón **Compartir** copia la dirección. Si el
perfil que se mira no es el que este dispositivo considera propio, la vista
avisa de que es el progreso de otra persona.

## Comandos

```bash
npm run dev        # desarrollo (Vite + API en Node)
npm run build      # frontend a dist/client + servidor a dist/server/node.mjs
npm start          # sirve frontend + API desde un solo proceso Node
npm run start:ts   # lo mismo, sin compilar, directo desde TypeScript
npm run deploy     # compila y despliega a Cloudflare Workers

npm run typecheck  # TypeScript estricto
npm run lint       # ESLint
npm test           # Vitest, sin red y sin clave de Steam

npm run guides:check    # valida los paquetes de guía y regenera games/index.json
npm run guides:schema   # regenera games/schema.json desde shared/guide.ts
npm run guides:build    # regenera games/2358720.json desde los datos de Steam
```

## Calidad

TypeScript estricto (con `noUncheckedIndexedAccess`), ESLint y Vitest. GitHub
Actions corre typecheck, lint, pruebas, validación de los paquetes de guía y
compilación en cada push y cada PR.

Las pruebas **no necesitan clave de Steam ni red**: todas las respuestas salen
de los fixtures de `server/steam/fixtures/`, que tienen la forma exacta de las
respuestas reales. Cubren:

- la verificación OpenID, con los once casos de aserción que hay que rechazar;
- la firma y validación de la cookie de sesión (manipulada, vencida, con otro
  secreto, emitida en el futuro);
- el parseo de cada respuesta de Steam, incluidos los campos que a veces no
  manda y el porcentaje global que llega como texto o como número;
- las reglas de la capa de guía: esquema, merge, puntos de no retorno, cobertura;
- que la clave de Steam no se filtre en ningún mensaje de error;
- el respaldo de ida y vuelta, con sus dos modos de importación;
- la interfaz completa, montando React en jsdom contra el servidor Hono de
  verdad: inicio, biblioteca, vista de juego, guía, datos y avisos de error.

Accesibilidad: `axe-core` revisa las cuatro vistas en cada prueba, y el
contraste de todos los pares de color de ambos temas se verifica por número
contra los umbrales de WCAG 2.1 AA (4.5:1 en texto, 3:1 en bordes de control).

## Estructura

```
src/          cliente React (rutas, componentes, i18n, libs)
shared/       tipos y reglas que usan cliente y servidor (rareza, SteamID, guía)
server/
  app.ts      API Hono: lista cerrada de endpoints
  steam/      un cliente por endpoint, esquemas Zod, fixtures y modo demo
  auth/       OpenID 2.0 y cookie de sesión firmada
  cache/      CacheStore: memoria por defecto, KV de Cloudflare si existe
  adapters/   node.ts | worker.ts | vercel.ts
api/          función de Vercel
netlify/      función de Netlify
games/        paquetes de guía por appid + esquema JSON generado
tools/        scripts de los paquetes de guía
tests/        API, parseo de Steam, OpenID, sesión, guía, respaldo e interfaz
```

El mismo `server/app.ts` corre en Cloudflare Workers, Vercel, Netlify y Node:
los adaptadores son de tres líneas y las variables se leen igual vengan como
bindings o como `process.env`.

## Licencia

MIT. Ver [LICENSE](LICENSE). Cómo colaborar: [CONTRIBUTING.md](CONTRIBUTING.md).
