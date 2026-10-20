/** Niveles de rareza derivados del porcentaje global de Steam. */
export const RARITY_TIERS = ['comun', 'pocoComun', 'rara', 'muyRara', 'ultraRara'] as const;

export type RarityTier = (typeof RARITY_TIERS)[number];

/** Umbral inferior (inclusive) de porcentaje global para cada nivel. */
export const RARITY_THRESHOLDS: ReadonlyArray<{ tier: RarityTier; minPercent: number }> = [
  { tier: 'comun', minPercent: 50 },
  { tier: 'pocoComun', minPercent: 20 },
  { tier: 'rara', minPercent: 10 },
  { tier: 'muyRara', minPercent: 5 },
  { tier: 'ultraRara', minPercent: 0 },
];

export function rarityTier(globalPercent: number | null): RarityTier | null {
  if (globalPercent === null || Number.isNaN(globalPercent)) return null;
  for (const { tier, minPercent } of RARITY_THRESHOLDS) {
    if (globalPercent >= minPercent) return tier;
  }
  return 'ultraRara';
}
