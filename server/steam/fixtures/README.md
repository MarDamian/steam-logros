# Fixtures de Steam

Respuestas de ejemplo con la forma exacta que devuelve la Web API de Steam.
Las usa el **modo fixtures** del servidor (cuando no hay `STEAM_API_KEY`) y
todas las pruebas, así `npm test` no necesita clave ni red.

## De dónde salen

| Archivo | Origen |
| --- | --- |
| `global-2358720.json` | Respuesta real de `GetGlobalAchievementPercentagesForApp` (no requiere clave), capturada el 2026-10-20. |
| `schema-2358720-spanish.json`, `schema-2358720-english.json` | Nombres, descripciones, marca de oculto e iconos de los 81 logros de Black Myth: Wukong, tomados de la ficha pública de logros del juego en Steam y reordenados a la forma de `GetSchemaForGame`. |
| `achievements-2358720.json` | Progreso **inventado** de un perfil de ejemplo: los 29 logros más comunes más tres raros. |
| `owned-games.json` | Biblioteca **inventada** con appids y nombres reales de juegos. |
| `player-summaries*.json`, `vanity-*.json`, `achievements-private.json`, `achievements-nostats.json` | Respuestas **inventadas** que reproducen los casos de perfil público, perfil privado, juego sin logros y URL personalizada inexistente. |

Los nombres y descripciones de logros son textos de Game Science / Valve y están
acá solo como datos de prueba de la integración.

## Regenerar

Los porcentajes globales se actualizan con:

```bash
curl -s "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=2358720"
```

Con una `STEAM_API_KEY` propia, el esquema de cualquier juego sale de
`ISteamUserStats/GetSchemaForGame/v2?key=...&appid=...&l=spanish`.
