import { describe, expect, it } from 'vitest';
import { VMT_TARIFF_STAND, VMT_TARIFF_ZONES, findTariffZone } from '../vmtTariff';

describe('VMT_TARIFF_ZONES (VMT-Preisübersicht, Stand 01.08.2025)', () => {
  it('has a fixed, dated Stand', () => {
    expect(VMT_TARIFF_STAND).toBe('2025-08-01');
  });

  it('has unique zone ids', () => {
    const ids = VMT_TARIFF_ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every price is positive with at most 2 decimals', () => {
    for (const zone of VMT_TARIFF_ZONES) {
      expect(zone.einzelfahrtEur).toBeGreaterThan(0);
      expect(Math.round(zone.einzelfahrtEur * 100)).toBeCloseTo(zone.einzelfahrtEur * 100, 6);
    }
  });

  it('reproduces known CityTarif Einzelfahrt prices (all four cities: 2,90 €)', () => {
    expect(findTariffZone('city-erfurt')?.einzelfahrtEur).toBe(2.9);
    expect(findTariffZone('city-weimar')?.einzelfahrtEur).toBe(2.9);
    expect(findTariffZone('city-jena')?.einzelfahrtEur).toBe(2.9);
    expect(findTariffZone('city-gera')?.einzelfahrtEur).toBe(2.9);
  });

  it('reproduces known CityRegioTarif Einzelfahrt endpoints (Preisstufe 2 = 4,00 €, 11 = 22,40 €)', () => {
    expect(findTariffZone('cityregio-2')?.einzelfahrtEur).toBe(4.0);
    expect(findTariffZone('cityregio-11')?.einzelfahrtEur).toBe(22.4);
  });

  it('reproduces known RegioTarif Einzelfahrt endpoints (Preisstufe 1 = 2,20 €, Verbundweit = 25,70 €)', () => {
    expect(findTariffZone('regio-1')?.einzelfahrtEur).toBe(2.2);
    expect(findTariffZone('regio-verbundweit')?.einzelfahrtEur).toBe(25.7);
  });

  it('CityRegioTarif prices increase monotonically with the Preisstufe', () => {
    const prices = ['cityregio-2', 'cityregio-3', 'cityregio-4', 'cityregio-5', 'cityregio-6',
      'cityregio-7', 'cityregio-8', 'cityregio-9', 'cityregio-10', 'cityregio-11']
      .map((id) => findTariffZone(id)!.einzelfahrtEur);
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });

  it('RegioTarif prices increase monotonically, including Verbundweit as the most expensive tier', () => {
    const prices = ['regio-1', 'regio-2', 'regio-3', 'regio-4', 'regio-5', 'regio-6', 'regio-7',
      'regio-8', 'regio-9', 'regio-10', 'regio-11', 'regio-verbundweit']
      .map((id) => findTariffZone(id)!.einzelfahrtEur);
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });

  it('findTariffZone returns undefined for an unknown id', () => {
    expect(findTariffZone('does-not-exist')).toBeUndefined();
  });
});
