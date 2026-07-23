/**
 * Stammdaten-Zugriff, quellenunabhängig: im Excel-Modus aus dem Tab
 * „Alle_TN_Daten" der geladenen Datei, sonst aus den Demo-Stammdaten.
 */
import type { MasterData } from './excel/workbook';
import { ExcelStorageAdapter } from './excel/excelStorage';
import { seedMasters } from './mock/seed';
import type { StorageAdapter } from './types';

export function getMaster(storage: StorageAdapter, participantId: string): MasterData | null {
  if (storage instanceof ExcelStorageAdapter) return storage.getMasterData(participantId);
  return seedMasters[participantId] ?? null;
}

export function listMasters(storage: StorageAdapter): MasterData[] {
  const all =
    storage instanceof ExcelStorageAdapter
      ? storage.listMasterData()
      : Object.values(seedMasters);
  return [...all].sort((a, b) => a.tnId.localeCompare(b.tnId));
}
