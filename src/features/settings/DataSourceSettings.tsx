/** Einstellungen: Datenquelle (Demo oder Excel/Projektordner) mit Strukturprüfung. */
import { useState } from 'react';
import { useSession } from '../../app/session';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../../app/ui';
import {
  createBrowserPersistence,
  ExcelStorageAdapter,
} from '../../adapters/excel/excelStorage';
import { AttendanceWorkbook } from '../../adapters/excel/attendanceWorkbook';
import { createFolderPersistence, openProjectFolder } from '../../adapters/excel/folderSource';
import type { ExcelValidationReport } from '../../adapters/excel/workbook';
import type { GoogleSheetsAttendanceSource as GoogleSheetsAttendanceSourceType } from '../../adapters/attendance/googleSheetsSource';
import { LocalYearWorkbook } from '../../adapters/attendance/localYearWorkbook';
import { useLogger } from '../../logging/react.tsx';
import { logAdapterSelected, logWorkbookValidation } from '../../logging/domainEvents.ts';
import { REVIEW_BUILD, SHEETS_SOURCE_ENABLED } from '../../app/reviewBuild';

export default function DataSourceSettings() {
  const {
    dataSource,
    setExcelStorage,
    setAttendanceSource,
    attendanceSource,
    setFormularContext,
    formularContext,
    resetToMock,
  } = useSession();
  const logger = useLogger();
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2026);
  const [report, setReport] = useState<ExcelValidationReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const openFolder = async () => {
    if (REVIEW_BUILD) return;
    setError('');
    setLoading(true);
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error(
          'Ordner-Modus benötigt Chrome/Edge (File System Access API). Alternativ unten die Einzeldatei öffnen.',
        );
      }
      const root: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      const project = await openProjectFolder(root);

      // Hauptdatei (Übersicht)
      const hauptBuf = await (await project.hauptFile.getFile()).arrayBuffer();
      const persistence = createFolderPersistence(project.hauptFile, project.backups);
      const { adapter, report } = await ExcelStorageAdapter.fromBuffer(
        hauptBuf,
        project.hauptName,
        month,
        year,
        persistence,
      );
      setReport(report);
      logWorkbookValidation(logger, report.ok, report.rowCount, report.schema?.unknownHeaders.length ?? 0);
      if (!report.ok) return;

      // Anwesenheitsliste (optional)
      if (project.anwesenheitFile) {
        const anwBuf = await (await project.anwesenheitFile.getFile()).arrayBuffer();
        const workbook = await AttendanceWorkbook.load(anwBuf, year);
        adapter.attachAttendanceProvider((m) => workbook.readMonth(m));
        adapter.attachAttendanceNotesProvider((m) => workbook.readNotes(m));
        setAttendanceSource({
          workbook,
          persistence: createFolderPersistence(project.anwesenheitFile, project.backups),
          fileName: project.anwesenheitName!,
        });
      } else {
        setAttendanceSource(null);
      }

      // Formular-Vorlage (optional)
      if (project.vorlageFile) {
        const tpl = await (await project.vorlageFile.getFile()).arrayBuffer();
        setFormularContext({ templateBuffer: tpl, formulareDir: project.formulare });
      } else {
        setFormularContext(null);
      }

      setExcelStorage(adapter, { kind: 'EXCEL', fileName: project.hauptName, month, year });
      logAdapterSelected(logger, 'EXCEL', 'FOLDER');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openExcel = async () => {
    if (REVIEW_BUILD) return;
    setError('');
    setLoading(true);
    try {
      let buffer: ArrayBuffer;
      let fileName: string;
      let handle: FileSystemFileHandle | null = null;

      if ('showOpenFilePicker' in window) {
        const [h] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        });
        handle = h;
        const file = await h.getFile();
        buffer = await file.arrayBuffer();
        fileName = file.name;
      } else {
        const file = await pickFileFallback();
        buffer = await file.arrayBuffer();
        fileName = file.name;
      }

      const { adapter, report } = await ExcelStorageAdapter.fromBuffer(
        buffer,
        fileName,
        month,
        year,
        createBrowserPersistence(handle),
      );
      setReport(report);
      logWorkbookValidation(logger, report.ok, report.rowCount, report.schema?.unknownHeaders.length ?? 0);
      if (report.ok) {
        setExcelStorage(adapter, { kind: 'EXCEL', fileName, month, year });
        logAdapterSelected(logger, 'EXCEL', 'FILE');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (REVIEW_BUILD) {
    return (
      <div className="space-y-4">
        <Eyebrow>Einstellungen · Datenquelle</Eyebrow>
        <Card>
          <p className="font-semibold">
            Aktive Quelle: <span className="text-ink-dim">Demo-Daten</span>
          </p>
          <p className="mt-2 text-sm text-ink-dim">
            Demofassung: Datei- und Ordner-Ladepfade sowie die Google-Sheets-Anbindung sind
            deaktiviert. Es lassen sich in dieser Fassung keine echten Dateien öffnen oder
            überschreiben.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Eyebrow>Einstellungen · Datenquelle</Eyebrow>

      <Card>
        <p className="font-semibold">
          Aktive Quelle:{' '}
          {dataSource.kind === 'MOCK' ? (
            <span className="text-ink-dim">Demo-Daten</span>
          ) : (
            <span className="text-primary">
              {dataSource.fileName} · Monat {dataSource.month}/{dataSource.year}
            </span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Monat
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-line p-2"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Jahr
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-line p-2"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <PrimaryButton onClick={openFolder} disabled={loading}>
            {loading ? 'Lädt…' : 'Projektordner öffnen (empfohlen)'}
          </PrimaryButton>
          <SecondaryButton onClick={openExcel}>
            Nur Hauptdatei öffnen
          </SecondaryButton>
          {dataSource.kind === 'EXCEL' && (
            <SecondaryButton
              onClick={() => {
                resetToMock();
                logAdapterSelected(logger, 'MOCK');
              }}
            >
              Zurück zu Demo-Daten
            </SecondaryButton>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-dim">
          Ordner-Konvention (siehe ORDNERSTRUKTUR.md): daten/haupt/ = genau eine .xlsx
          (Hauptdatei) · daten/anwesenheit/ = genau eine .xlsx (Anwesenheitsliste) ·
          daten/backups/ = automatische Zeitstempel-Backups vor JEDEM Schreiben.
          Der PFAD zählt, nicht der Dateiname. Bitte die Dateien währenddessen nicht
          gleichzeitig in Excel geöffnet halten — Excel-Dateien können nicht
          zusammengeführt werden.
        </p>
        {formularContext && (
          <p className="mt-1 text-xs font-semibold text-success">
            Formular-Vorlage gefunden (daten/vorlagen/) — Abrechnungsformulare können erzeugt
            werden.
          </p>
        )}
        {attendanceSource && (
          <p className="mt-1 text-xs font-semibold text-success">
            Anwesenheitsliste verbunden: {attendanceSource.fileName} — Tagesdaten aktiv,
            Dozent-Ansicht schreibt direkt in die Liste.
          </p>
        )}
      </Card>

      {error && (
        <Card className="border-danger">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {report && (
        <Card className={report.ok ? 'border-success' : 'border-danger'}>
          <Eyebrow>Struktur-Prüfung</Eyebrow>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Übersicht-Blatt: {report.uebersichtSheet ?? '— nicht gefunden'}</li>
            <li>Stammdaten-Blatt: {report.masterSheet ?? '— nicht gefunden'}</li>
            <li>Zeilen gesamt: {report.rowCount}</li>
            {report.schema && (
              <li>
                Erkannte Spalten: {report.schema.columns.size} · Unbekannte Spalten:{' '}
                {report.schema.unknownHeaders.length > 0
                  ? report.schema.unknownHeaders.join(', ')
                  : 'keine'}
              </li>
            )}
          </ul>
          {report.errors.map((e) => (
            <p key={e} className="mt-2 rounded-lg bg-blush-weak p-2 text-sm text-danger">
              {e}
            </p>
          ))}
          {report.ok && (
            <p className="mt-2 text-sm font-semibold text-success">
              Struktur validiert — Spalten werden über Kopfzeilen erkannt, Umsortieren der
              Spalten bricht nichts.
            </p>
          )}
          {report.issues.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold">
                {report.issues.length} Daten-Hinweise (toleriert, nicht blockierend)
              </summary>
              <ul className="mt-2 space-y-1">
                {report.issues.slice(0, 30).map((issue, i) => (
                  <li key={i} className="text-ink-dim">
                    <strong>{issue.tnId}</strong> · {issue.field}: „{issue.raw}" — {issue.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}

      <YearListPanel />
      {SHEETS_SOURCE_ENABLED && <SheetsPanel />}
    </div>
  );
}

function pickFileFallback(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) resolve(file);
      else reject(new DOMException('Abgebrochen', 'AbortError'));
    };
    input.click();
  });
}

/**
 * Google Sheets als Anwesenheitsquelle.
 *
 * Bewusst KEINE dritte Option neben „Demo" und „Excel": die Sheets-Datei
 * enthält nur Tagesmarkierungen. Stammdaten, Tickets, Dokumente und Status
 * kommen weiterhin aus der aktiven Quelle. Sheets wird deshalb übergelagert
 * und kann jederzeit wieder gelöst werden, ohne die übrige Konfiguration
 * anzufassen.
 *
 * Nur lesend — mit einem API-Key ist kein Schreiben möglich. Eingaben in der
 * Anwesenheitsliste gehen daher weiterhin an die darunterliegende Quelle.
 *
 * NFR-01: sends the spreadsheet ID and API key to sheets.googleapis.com —
 * a real external SaaS call. Off by default (VITE_ENABLE_SHEETS_SOURCE),
 * forced off entirely in the review build (see src/app/reviewBuild.ts).
 * Local-experiment only — must never be pointed at a real cohort's sheet.
 *
 * The adapter module is dynamically imported inside connect() below, not
 * statically at the top of this file: that keeps sheets.googleapis.com out
 * of the main bundle entirely (it ends up in its own chunk, fetched only if
 * this panel is both enabled and actually used) rather than merely
 * unreachable-but-present, which is what the build-time no-external-URL
 * guard test checks for.
 */
function SheetsPanel() {
  const { storage, month: ym, refreshStorage } = useSession();
  const year = Number(ym.slice(0, 4));

  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [dailyTab, setDailyTab] = useState(String(year));
  const [overallTab, setOverallTab] = useState('Overall');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  const canOverlay = typeof storage.setAttendanceOverlay === 'function';

  async function connect() {
    setErr('');
    setInfo(null);
    setBusy(true);
    try {
      const { GoogleSheetsAttendanceSource } = await import(
        '../../adapters/attendance/googleSheetsSource'
      );
      const source: GoogleSheetsAttendanceSourceType = new GoogleSheetsAttendanceSource({
        spreadsheetId: spreadsheetId.trim(),
        apiKey: apiKey.trim(),
        dailyTab: dailyTab.trim(),
        overallTab: overallTab.trim() || undefined,
        year,
      });

      // Alle zwölf Monate vorab laden: die Blätter werden ohnehin komplett
      // geholt, und der Overlay-Zugriff muss synchron antworten können.
      const byMonth = new Map<string, Awaited<ReturnType<typeof source.readMonth>>>();
      for (let m = 1; m <= 12; m += 1) {
        byMonth.set(`${year}-${String(m).padStart(2, '0')}`, await source.readMonth(m));
      }

      const overlay = (monthYm: string) => {
        const r = byMonth.get(monthYm);
        return { marks: r?.marks ?? new Map(), notes: r?.notes ?? new Map() };
      };
      storage.setAttendanceOverlay?.(overlay);

      const mismatches = [...byMonth.values()].flatMap((r) =>
        r.crossCheck.filter((c) => !c.agrees),
      );
      const warnings = [...byMonth.values()].flatMap((r) => r.warnings);

      setInfo(
        `Verbunden. ${mismatches.length === 0
          ? 'Alle Monate stimmen mit dem Overall-Blatt überein.'
          : `${mismatches.length} Abweichung(en) zum Overall-Blatt: ` +
            mismatches.slice(0, 5).map((m) => `${m.tnId} ${m.computed}≠${m.reported}`).join(', ')}` +
          (warnings.length > 0
            ? ` · ${warnings.length} Zeile(n) mit ungültiger TN-ID: ` +
              warnings.slice(0, 3).map((w) => `Zeile ${w.row} (${w.lastName})`).join(', ')
            : ''),
      );
      refreshStorage();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    storage.setAttendanceOverlay?.(null);
    setInfo(null);
    refreshStorage();
  }

  return (
    <Card>
      <Eyebrow>Anwesenheitsliste aus Google Sheets (nur lesen)</Eyebrow>
      <p className="mt-1 text-xs text-ink-dim">
        Überlagert nur die Tagesmarkierungen für {year}. Stammdaten, Tickets und Status
        bleiben aus der aktiven Quelle. Die Datei muss per Link freigegeben sein; der
        API-Key sollte auf diese Anwendung eingeschränkt werden.
      </p>

      {!canOverlay && (
        <p className="mt-2 text-xs text-danger">
          Die aktive Datenquelle unterstützt keine externe Anwesenheitsquelle.
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Tabellen-ID
          <input
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="1jk1qpwhy…"
            className="mt-1 block w-full rounded-lg border border-line p-2 text-sm"
          />
        </label>
        <label className="text-sm">
          API-Key
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            autoComplete="off"
            className="mt-1 block w-full rounded-lg border border-line p-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Blatt mit Tagesdaten
          <input
            value={dailyTab}
            onChange={(e) => setDailyTab(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line p-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Blatt mit Monatssummen (optional)
          <input
            value={overallTab}
            onChange={(e) => setOverallTab(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line p-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PrimaryButton
          onClick={connect}
          disabled={busy || !canOverlay || !spreadsheetId.trim() || !apiKey.trim()}
        >
          {busy ? 'Lädt…' : 'Verbinden und prüfen'}
        </PrimaryButton>
        {info && <SecondaryButton onClick={disconnect}>Verbindung lösen</SecondaryButton>}
      </div>

      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      {info && <p className="mt-2 text-sm text-success">{info}</p>}
    </Card>
  );
}

/**
 * Anwesenheitsliste als .xlsx im Jahresblatt-Layout.
 *
 * Die Jahre werden aus den Blattnamen ermittelt, nicht eingestellt: legt der
 * Träger ein Blatt „2027" an, erscheint 2027 hier ohne Codeänderung und ohne
 * Konfiguration. Damit bleibt die Datei das, was sie beim Träger ohnehin ist —
 * eine Excel-Mappe, die pro Jahr um ein Blatt wächst.
 */
function YearListPanel() {
  const { storage, refreshStorage, setAttendanceYears } = useSession();
  const [wbk, setWbk] = useState<LocalYearWorkbook | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  const canOverlay = typeof storage.setAttendanceOverlay === 'function';

  async function load(buffer: ArrayBuffer, name: string) {
    const loaded = await LocalYearWorkbook.fromBuffer(buffer, name);
    setWbk(loaded);
    const preferred = loaded.years.includes(new Date().getFullYear())
      ? new Date().getFullYear()
      : loaded.years[loaded.years.length - 1];
    setYear(preferred);
    setInfo(
      `„${name}" geladen · Jahresblätter: ${loaded.years.join(', ')}` +
        (loaded.overallTabName ? ` · Abgleich gegen „${loaded.overallTabName}"` : ''),
    );
  }

  async function loadDemo() {
    setErr(''); setInfo(null); setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}demo/Anwesenheitsliste_Demo.xlsx`);
      if (!res.ok) throw new Error(`Demodatei nicht gefunden (${res.status}).`);
      await load(await res.arrayBuffer(), 'Anwesenheitsliste_Demo.xlsx');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function loadOwn() {
    setErr(''); setInfo(null); setBusy(true);
    try {
      const file = await pickFileFallback();
      await load(await file.arrayBuffer(), file.name);
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        setErr(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!wbk) return;
    setErr('');
    try {
      // Alle Jahresblätter auf einmal — die Jahresübersicht und das
      // Kalenderblatt schalten zwischen Jahren um und brauchen sie alle.
      const byMonth = wbk.readAllYears();
      storage.setAttendanceOverlay?.((monthYm) => {
        const r = byMonth.get(monthYm);
        return {
          marks: r?.marks ?? new Map(),
          notes: r?.notes ?? new Map(),
          participants: r?.participants,
        };
      });
      const mismatches = [...byMonth.values()].flatMap((r) =>
        r.crossCheck.filter((c) => !c.agrees),
      );
      const warnings = [...byMonth.values()].flatMap((r) => r.warnings);
      setAttendanceYears(wbk.years);
      setInfo(
        `${wbk.years.join(', ')} aktiv. ` +
          (mismatches.length === 0
            ? 'Alle Monate stimmen mit dem Overall-Blatt überein.'
            : `${mismatches.length} Abweichung(en): ` +
              mismatches.slice(0, 5).map((m) => `${m.tnId} ${m.computed}≠${m.reported}`).join(', ')) +
          (warnings.length > 0
            ? ` · ${warnings.length} Zeile(n) mit ungültiger TN-ID: ` +
              warnings.slice(0, 3).map((w) => `Zeile ${w.row} (${w.lastName})`).join(', ')
            : ''),
      );
      refreshStorage();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Card>
      <Eyebrow>Anwesenheitsliste (.xlsx, ein Blatt je Jahr)</Eyebrow>
      <p className="mt-1 text-xs text-ink-dim">
        Die Jahre werden aus den Blattnamen gelesen. Ein neues Blatt „2027" in der Datei
        genügt — hier ist nichts einzustellen. Blätter wie „Regeln" oder „Overall" werden
        automatisch übersprungen; „Overall" dient dem Abgleich der Monatssummen.
      </p>

      {!canOverlay && (
        <p className="mt-2 text-xs text-danger">
          Die aktive Datenquelle unterstützt keine externe Anwesenheitsquelle.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <PrimaryButton onClick={loadDemo} disabled={busy || !canOverlay}>
          {busy ? 'Lädt…' : 'Demodatei laden'}
        </PrimaryButton>
        <SecondaryButton onClick={loadOwn}>Eigene Datei öffnen</SecondaryButton>

        {wbk && (
          <>
            <label className="text-sm">
              Jahr
              <select
                value={year ?? ''}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 block rounded-lg border border-line p-2"
              >
                {wbk.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <PrimaryButton onClick={apply}>Jahr übernehmen</PrimaryButton>
          </>
        )}
      </div>

      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      {info && <p className="mt-2 text-sm text-success">{info}</p>}
    </Card>
  );
}
