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
| 2 | Login con OpenID 2.0 de Steam, sesión firmada y seguridad | listo |
| 3 | Capa de guía por juego (perdibles, capítulos) y notas | listo |
| 4 | PWA, exportar/importar, enlaces para compartir | listo |
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

## Login con Steam

Es OpenID 2.0, el único mecanismo que ofrece Valve. **Solo identifica a la
persona**: Steam no entrega contraseña, correo ni permiso alguno sobre la cuenta.

Para habilitarlo hacen falta dos variables:

```
SESSION_SECRET=$(openssl rand -hex 32)
PUBLIC_BASE_URL=https://tu-dominio      # sin barra final
```

`PUBLIC_BASE_URL` no es decorativa: de ahí salen el `return_to` y el `realm` que
se le mandan a Steam, y contra ella se valida la respuesta. Si no coincide con
el dominio real, el login falla a propósito.

Qué hace el servidor con la respuesta de Steam:

1. Comprueba `mode=id_res`, el namespace de OpenID 2.0 y que el `op_endpoint`
   sea exactamente `https://steamcommunity.com/openid/login`.
2. Exige que `claimed_id` sea `https://steamcommunity.com/openid/id/<17 dígitos>`
   y que `identity` apunte al mismo.
3. Exige que `return_to` sea exactamente el nuestro.
4. Exige que la firma cubra `claimed_id`, `identity`, `return_to`,
   `response_nonce` y `op_endpoint`.
5. Rechaza nonces viejos (más de 10 minutos) y nonces ya usados.
6. Y recién entonces le pregunta a Steam con `check_authentication`. Sin un
   `is_valid:true` no hay sesión.

La sesión es una cookie `httpOnly`, `SameSite=Lax`, `Secure` en https, firmada
con HMAC-SHA256. No hay base de datos ni estado en el servidor.

## Para que Steam muestre tus logros

Steam solo entrega logros de perfiles públicos. En
*Editar perfil → Configuración de privacidad* hay que poner en **Público**
tanto **Mi perfil** como **Detalles del juego**.

## Capa de guía por juego

Steam no sabe nada de capítulos, de logros que se pueden perder ni de cómo
conseguir cada cosa: eso es dato de comunidad y vive en `games/<appid>.json`.
Si un juego no tiene paquete, funciona igual con los datos de Steam.

Cuando sí lo tiene, la vista del juego añade:

- el tipo de cada logro (historia / se puede perder / en cualquier momento /
  nueva partida+ / sin clasificar) y su capítulo,
- cómo conseguirlo y el aviso correspondiente,
- filtros por tipo y por capítulo,
- un selector de "¿en qué capítulo vas?" que se recuerda por juego,
- y el panel **Cuidado: puntos de no retorno**, que lista solo los logros que
  todavía te faltan de cada punto que tengas por delante.

El paquete que viene en el repo, `games/2358720.json` (Black Myth: Wukong),
tiene **19 de los 81 logros clasificados** y lo dice en la interfaz. Esos 19
salen de datos de Steam: el logro que cierra el prólogo es de historia y los que
Steam no esconde son los acumulativos de colección y mejora. Los 62 ocultos
quedan `sin-clasificar` a propósito: decidir si un logro se puede perder, y en
qué capítulo está, no se puede sacar de la API, y un aviso de "perdible"
equivocado es peor que ninguno. En [CONTRIBUTING.md](CONTRIBUTING.md) está cómo
completarlo.

Además, cada logro acepta una **nota propia** y una marca de "resuelto por mí",
que se guardan en `localStorage` de ese dispositivo.

## Instalable en el celular

Hay `manifest.webmanifest` con iconos de 192, 512 y uno *maskable*, y un
service worker propio en `public/sw.js` (sin librerías) con tres estrategias:

- **navegación**: red primero y, si no hay, el `index.html` cacheado — por eso
  la app instalada abre sin conexión;
- **estáticos nuestros** (`/assets/`, `/icons/`, `/games/`): caché primero, que
  es seguro porque los assets llevan hash en el nombre;
- **API**: red primero y, si falla, la última respuesta guardada, marcada con la
  cabecera `x-logros-cache: viejo`.

Las rutas de login (`/api/auth/`) nunca pasan por el service worker: son
redirecciones. El service worker se registra solo en producción.

## Tus datos

Las notas, las marcas propias y el capítulo en el que vas se guardan en
`localStorage`. No hay servidor donde queden copiados, así que en **Mis datos**
(`/datos`) están el exportar a JSON y el importar, con dos modos: *mezclar*
(gana la nota más reciente de cada logro) o *reemplazar* lo que haya de cada
juego. También está el borrado total de lo guardado en el dispositivo.

## Compartir progreso

`/u/<steamid>` y `/u/<steamid>/<appid>` son direcciones públicas de solo
lectura: no necesitan sesión y muestran lo que Steam dice de ese perfil. El
botón **Compartir** copia la dirección. Cuando el perfil que se mira no es el
que este dispositivo considera propio, la vista avisa de que es el progreso de
otra persona y que las notas que escribas son tuyas.

## Comandos

```bash
npm run dev        # desarrollo (Vite + API en Node)
npm run build      # compila el frontend a dist/client
npm start          # sirve frontend + API desde un solo proceso Node
npm run typecheck  # TypeScript estricto
npm run lint       # ESLint
npm test           # Vitest (no necesita clave de Steam)

npm run guides:check    # valida los paquetes de guía y regenera games/index.json
npm run guides:schema   # regenera games/schema.json desde shared/guide.ts
```

## Estructura

```
src/          cliente React (rutas, componentes, i18n)
shared/       tipos y reglas que usan cliente y servidor
server/       API Hono portable + capa de Steam con validación Zod
  steam/      clientes por endpoint, esquemas Zod y modo fixtures
  cache/      CacheStore: memoria por defecto, KV de Cloudflare si existe
games/        paquetes de guía por appid + esquema JSON generado
tools/        scripts: generar y validar paquetes de guía
tests/        pruebas de API, de lógica y de interfaz en jsdom
```

## Licencia

MIT. Ver [LICENSE](LICENSE).
