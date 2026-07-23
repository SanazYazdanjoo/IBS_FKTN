/**
 * Projektordner-Konvention (siehe ORDNERSTRUKTUR.md): Dateien werden über
 * feste Pfade gefunden, nicht über Namen. Je Datenordner genau eine .xlsx;
 * Backups liegen unter daten/backups/.
 */
import type { ExcelPersistence } from './excelStorage';

export const FOLDER_LAYOUT = {
  daten: 'daten',
  haupt: 'haupt',
  anwesenheit: 'anwesenheit',
  vorlagen: 'vorlagen',
  formulare: 'formulare',
  backups: 'backups',
} as const;

export interface ProjectFolder {
  root: FileSystemDirectoryHandle;
  hauptFile: FileSystemFileHandle;
  hauptName: string;
  anwesenheitFile: FileSystemFileHandle | null;
  anwesenheitName: string | null;
  vorlageFile: FileSystemFileHandle | null;
  backups: FileSystemDirectoryHandle;
  formulare: FileSystemDirectoryHandle;
}

async function dir(
  parent: FileSystemDirectoryHandle,
  name: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  try {
    return await parent.getDirectoryHandle(name, { create });
  } catch {
    throw new Error(
      `Ordner „${name}" nicht gefunden. Erwartete Struktur siehe ORDNERSTRUKTUR.md — ` +
        `bitte den Projektordner (nicht einen Unterordner) auswählen.`,
    );
  }
}

async function singleXlsx(
  folder: FileSystemDirectoryHandle,
  label: string,
): Promise<FileSystemFileHandle> {
  const candidates: FileSystemFileHandle[] = [];
  for await (const [name, handle] of folder as unknown as AsyncIterable<
    [string, FileSystemHandle]
  >) {
    if (
      handle.kind === 'file' &&
      name.toLowerCase().endsWith('.xlsx') &&
      !name.startsWith('~$')
    ) {
      candidates.push(handle as FileSystemFileHandle);
    }
  }
  if (candidates.length === 0) {
    throw new Error(`Keine .xlsx in daten/${label}/ gefunden — dort gehört genau eine Datei hin.`);
  }
  if (candidates.length > 1) {
    throw new Error(
      `Mehrere .xlsx in daten/${label}/: ${candidates.map((c) => c.name).join(', ')}. ` +
        `Es darf genau EINE geben — bitte alte Versionen nach daten/backups/ verschieben.`,
    );
  }
  return candidates[0];
}

export async function openProjectFolder(
  root: FileSystemDirectoryHandle,
): Promise<ProjectFolder> {
  const daten = await dir(root, FOLDER_LAYOUT.daten);
  const haupt = await dir(daten, FOLDER_LAYOUT.haupt);
  const hauptFile = await singleXlsx(haupt, FOLDER_LAYOUT.haupt);

  let anwesenheitFile: FileSystemFileHandle | null = null;
  try {
    const anw = await dir(daten, FOLDER_LAYOUT.anwesenheit);
    anwesenheitFile = await singleXlsx(anw, FOLDER_LAYOUT.anwesenheit);
  } catch {
    anwesenheitFile = null;
  }

  let vorlageFile: FileSystemFileHandle | null = null;
  try {
    const vorlagen = await dir(daten, FOLDER_LAYOUT.vorlagen);
    vorlageFile = await singleXlsx(vorlagen, FOLDER_LAYOUT.vorlagen);
  } catch {
    vorlageFile = null;
  }

  const backups = await dir(daten, FOLDER_LAYOUT.backups, true);
  const formulare = await dir(daten, FOLDER_LAYOUT.formulare, true);

  return {
    root,
    hauptFile,
    hauptName: hauptFile.name,
    anwesenheitFile,
    anwesenheitName: anwesenheitFile?.name ?? null,
    vorlageFile,
    backups,
    formulare,
  };
}

/** Erzeugtes Formular unter daten/formulare/JJJJ-MM/ ablegen. */
export async function saveFormular(
  formulare: FileSystemDirectoryHandle,
  year: number,
  month: number,
  fileName: string,
  buffer: ArrayBuffer,
): Promise<string> {
  const sub = await formulare.getDirectoryHandle(
    `${year}-${String(month).padStart(2, '0')}`,
    { create: true },
  );
  const file = await sub.getFileHandle(fileName, { create: true });
  const writable = await file.createWritable();
  await writable.write(buffer);
  await writable.close();
  return `daten/formulare/${year}-${String(month).padStart(2, '0')}/${fileName}`;
}

/** Persistenz in die Projektdateien; Backups nach daten/backups/. */
export function createFolderPersistence(
  file: FileSystemFileHandle,
  backups: FileSystemDirectoryHandle,
): ExcelPersistence {
  return {
    async save(buffer) {
      const writable = await file.createWritable();
      await writable.write(buffer);
      await writable.close();
    },
    async saveBackup(buffer, suggestedName) {
      const handle = await backups.getFileHandle(suggestedName, { create: true });
      const writable = await handle.createWritable();
      await writable.write(buffer);
      await writable.close();
    },
  };
}
