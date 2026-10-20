/** URLs públicas de las imágenes de Steam. No hacen falta claves ni proxy. */
export function gameHeaderUrl(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function gameCapsuleUrl(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`;
}

export function storeUrl(appid: number): string {
  return `https://store.steampowered.com/app/${appid}/`;
}

export function steamAchievementsUrl(appid: number): string {
  return `https://steamcommunity.com/stats/${appid}/achievements/`;
}
