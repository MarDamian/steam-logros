import { describe, expect, it } from 'vitest';
import { rarityTier } from '../shared/rarity';

describe('rarityTier', () => {
  it('clasifica por porcentaje global', () => {
    expect(rarityTier(97.7)).toBe('comun');
    expect(rarityTier(50)).toBe('comun');
    expect(rarityTier(49.9)).toBe('pocoComun');
    expect(rarityTier(20)).toBe('pocoComun');
    expect(rarityTier(19.9)).toBe('rara');
    expect(rarityTier(10)).toBe('rara');
    expect(rarityTier(9.9)).toBe('muyRara');
    expect(rarityTier(5)).toBe('muyRara');
    expect(rarityTier(4.9)).toBe('ultraRara');
    expect(rarityTier(0)).toBe('ultraRara');
  });

  it('devuelve null cuando Steam no informa el porcentaje', () => {
    expect(rarityTier(null)).toBeNull();
    expect(rarityTier(Number.NaN)).toBeNull();
  });
});
