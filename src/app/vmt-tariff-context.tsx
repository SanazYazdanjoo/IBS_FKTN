/**
 * Tarifzonen-Kontext: Preise der offiziellen VMT-Tarifzonen (`vmtTariff.ts`),
 * zur Laufzeit änderbar und in localStorage gespiegelt (gleicher Aufbau wie
 * `rules-context.tsx` / `vmt-fares-context.tsx`). Zonen-Ids, -Labels und
 * -Gruppierung bleiben die feste Struktur aus dem Domain-Modul — geändert
 * werden nur die Preise (Stand kann sich mehrmals im Jahr ändern; Zuschnitt
 * der Tarifzonen praktisch nie).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  VMT_TARIFF_GROUPS,
  VMT_TARIFF_ZONES,
  type VmtTariffZone,
} from '../domain/vmtTariff';

const STORAGE_KEY = 'ibs-vmt-tariff-v1';

type PriceOverrides = Record<string, number>;

function loadFromStorage(): PriceOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function applyOverrides(zone: VmtTariffZone, overrides: PriceOverrides): VmtTariffZone {
  const priceEur = overrides[zone.id];
  return priceEur === undefined ? zone : { ...zone, einzelfahrtEur: priceEur };
}

interface VmtTariffContextValue {
  zones: readonly VmtTariffZone[];
  groups: readonly { label: string; zones: VmtTariffZone[] }[];
  findZone: (id: string) => VmtTariffZone | undefined;
  setZonePrice: (id: string, priceEur: number) => void;
  resetTariff: () => void;
}

const VmtTariffContext = createContext<VmtTariffContextValue | null>(null);

export function VmtTariffProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<PriceOverrides>(loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      // localStorage kann in seltenen Fällen nicht verfügbar sein — die
      // Preise bleiben dann nur für die laufende Sitzung erhalten.
    }
  }, [overrides]);

  const zones = useMemo(
    () => VMT_TARIFF_ZONES.map((z) => applyOverrides(z, overrides)),
    [overrides],
  );
  const groups = useMemo(
    () =>
      VMT_TARIFF_GROUPS.map((g) => ({
        label: g.label,
        zones: g.zones.map((z) => applyOverrides(z, overrides)),
      })),
    [overrides],
  );

  const findZone = (id: string) => zones.find((z) => z.id === id);
  const setZonePrice = (id: string, priceEur: number) =>
    setOverrides((prev) => ({ ...prev, [id]: priceEur }));
  const resetTariff = () => setOverrides({});

  return (
    <VmtTariffContext.Provider value={{ zones, groups, findZone, setZonePrice, resetTariff }}>
      {children}
    </VmtTariffContext.Provider>
  );
}

export function useVmtTariff(): VmtTariffContextValue {
  const ctx = useContext(VmtTariffContext);
  if (!ctx) throw new Error('useVmtTariff must be used within VmtTariffProvider');
  return ctx;
}
