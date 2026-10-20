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
