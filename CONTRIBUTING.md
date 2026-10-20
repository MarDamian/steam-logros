# Cómo contribuir

Gracias por querer ayudar. Lo que más falta son **paquetes de guía**.

> Este proyecto no está afiliado a Valve, a Steam ni a las desarrolladoras de
> los juegos. Todo lo que hay acá son datos públicos de la Web API de Steam más
> notas escritas por la comunidad.

## Antes de empezar

```bash
npm install
cp .env.example .env     # sin clave de Steam alcanza: arranca en modo fixtures
npm run dev
npm run typecheck && npm run lint && npm test
```

## Añadir un paquete de guía

Steam **no** sabe nada de capítulos, de logros que se pueden perder ni de cómo
conseguir cada cosa. `GetSchemaForGame` da el nombre, la descripción, el icono y
si el logro está oculto; `GetGlobalAchievementPercentagesForApp` da el porcentaje
global. Todo lo demás lo aporta la comunidad, y vive en `games/<appid>.json`.

1. Creá `games/<appid>.json` con el appid del juego (el número que aparece en la
   URL de la tienda de Steam).
2. Seguí el formato de abajo. El esquema completo está en
   [`games/schema.json`](games/schema.json), generado desde
   [`shared/guide.ts`](shared/guide.ts), que es la fuente de verdad.
3. Validá antes de abrir el PR:

   ```bash
   npm run guides:check     # valida todos los paquetes y regenera games/index.json
   ```

4. Abrí el PR. CI vuelve a validar: un paquete inválido no entra.

### Formato

```json
{
  "schemaVersion": 1,
  "appid": 2358720,
  "game": "Nombre del juego",
  "locale": "es",
  "updatedAt": "2026-10-20",
  "source": { "name": "De dónde salieron los datos", "url": "https://…" },
  "note": "Qué cubre el paquete y qué falta.",
  "chapters": [{ "id": "capitulo-1", "order": 1, "name": "Capítulo 1" }],
  "achievements": {
    "81003": {
      "type": "perdible",
      "chapter": "capitulo-1",
      "how": "Qué hay que hacer, con tus palabras.",
      "warning": "Qué se pierde si avanzás sin hacerlo.",
      "pointOfNoReturn": "fin-capitulo-1"
    }
  },
  "pointsOfNoReturn": [
    {
      "id": "fin-capitulo-1",
      "chapter": "capitulo-1",
      "title": "Antes del jefe final del Capítulo 1",
      "description": "Qué pasa al pasar este punto.",
      "locks": ["81003"]
    }
  ]
}
```

La clave de `achievements` es el **apiName** del logro, no su nombre visible. Se
saca de `GetSchemaForGame` o de la ficha pública de logros del juego en Steam.

### Los cinco tipos

| `type` | Cuándo usarlo |
| --- | --- |
| `historia` | Se consigue avanzando. No hay forma de perderlo. |
| `perdible` | Se puede perder para siempre en esta partida si avanzás sin hacerlo. |
| `cualquier-momento` | Se puede conseguir cuando sea, incluso después del final. |
| `ng+` | Necesita una segunda vuelta o una partida nueva. |
| `sin-clasificar` | Todavía no se sabe. **Es un estado válido**, no un hueco a tapar. |

### Tres reglas que importan

1. **Escribí con tus palabras.** No copies textos de otras guías. Si querés
   apuntar a una, usá `source.url` en vez de pegar el texto.
2. **`perdible` solo si estás seguro.** Un aviso equivocado es peor que ninguno:
   alguien va a cambiar cómo juega por lo que digas acá. Si tenés dudas, dejalo
   en `sin-clasificar` y explicá la duda en el PR.
3. **Un paquete incompleto sirve.** La interfaz muestra cuántos logros están
   clasificados y avisa de que el resto es dato de comunidad. Es mejor diez
   entradas buenas que ochenta inventadas: `sin-clasificar` existe para eso.

## Código

- TypeScript estricto. `npm run typecheck`, `npm run lint` y `npm test` tienen
  que pasar.
- Las pruebas no usan red ni clave de Steam: todo sale de los fixtures de
  `server/steam/fixtures/`.
- Si tocás cómo se habla con Steam, mirá primero la documentación oficial y
  añadí un fixture con la forma real de la respuesta.
- La clave `STEAM_API_KEY` solo existe en el servidor. Nada de pasarla al
  navegador, ni a los logs, ni a un mensaje de error.
