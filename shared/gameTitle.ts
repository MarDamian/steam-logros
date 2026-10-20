/**
 * De dónde sale el nombre que se muestra de un juego.
 *
 * El campo `gameName` de GetSchemaForGame es lo que la desarrolladora escribió
 * en su configuración de logros, y no siempre es el nombre del juego: Black
 * Myth: Wukong devuelve literalmente "testtest". Así que se prefiere, en este
 * orden, el nombre de la tienda (GetOwnedGames), el del paquete de guía, y solo
 * al final el del esquema.
 */
export interface GameTitleSources {
  /** Nombre que da GetOwnedGames, que es el de la tienda. */
  libraryName?: string | undefined;
  /** Nombre que declara el paquete de guía. */
  packName?: string | undefined;
  /** gameName de GetSchemaForGame. Puede ser un marcador de pruebas. */
  catalogName?: string | undefined;
  appid: number;
}

export function resolveGameTitle({ libraryName, packName, catalogName, appid }: GameTitleSources): string {
  return firstUsable(libraryName) ?? firstUsable(packName) ?? firstUsable(catalogName) ?? `App ${appid}`;
}

function firstUsable(value: string | undefined): string | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
}
