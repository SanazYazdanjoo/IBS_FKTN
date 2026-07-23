/**
 * Abrechnungsformular: automatisch befüllte Vorschau mit Prüfungen.
 * Speichern nur bei bestandenen Prüfungen; Ablage unter daten/formulare/.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { formatEuro } from '../../domain/reimbursement';
import { vmtSingleFaresEur } from '../../adapters/mock/seed';
import {
  fillAbrechnungsformular,
  formularChecks,
  formularFileName,
  type FormularData,
} from '../../adapters/excel/formFiller';
import { saveFormular } from '../../adapters/excel/folderSource';
import { ExcelStorageAdapter } from '../../adapters/excel/excelStorage';
import { GERMAN_MONTHS } from '../../adapters/excel/attendanceWorkbook';
import type { MonthRecord } from '../../domain/types';

export default function FormularScreen() {
  const { participantId } = useParams<{ participantId: string }>();
  const { user, storage, dataSource, formularContext, month: MONTH } = useSession();
  const { rules } = useRules();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [savedPath, setSavedPath] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!participantId) return;
    storage.getMonthRecord(user, participantId, MONTH).then(setRecord).catch((e) => setError(e.message));
  }, [participantId, user, storage, MONTH]);

  const month = dataSource.kind === 'EXCEL' ? dataSource.month : 7;
  const year = dataSource.kind === 'EXCEL' ? dataSource.year : 2026;

  const data: FormularData | null = useMemo(() => {
    if (!record) return null;
    const view = computeMonthView(record, rules, vmtSingleFaresEur[record.participantId]);
    const master =
      storage instanceof ExcelStorageAdapter ? storage.getMasterData(record.participantId) : null;
    return { record, view, master, month, year };
  }, [record, rules, storage, month, year]);

  if (error) return <Card className="border-danger"><p className="text-sm text-danger">{error}</p></Card>;
  if (!record || !data) return <p className="text-ink-dim">Lädt…</p>;

  const checks = formularChecks(data);
  const allGreen = checks.every((c) => c.ok);
  const { view, master } = data;

  const save = async () => {
    setError('');
    try {
      if (!formularContext) throw new Error('Keine Vorlage geladen (daten/vorlagen/) — Projektordner öffnen.');
      const filled = await fillAbrechnungsformular(formularContext.templateBuffer, data);
      const path = await saveFormular(
        formularContext.formulareDir, year, month, formularFileName(record, month, year), filled,
      );
      setSavedPath(path);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1fr]">
      {/* ── form preview (print target) ── */}
      <div className="print-formular rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-center font-display text-xl font-bold">Fahrkosten-Abrechnung</h1>
        <p className="mt-1 text-center text-xs text-ink-dim">
          Für Teilnehmer*innen an Schulungen/Maßnahmen — „Qualifizierung SprInt"
        </p>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Field label="Name" value={master?.nachname ?? record.participantName} />
          <Field label="Vorname" value={master?.vorname ?? ''} />
          <Field label="Straße / Hausnr." value={`${master?.strasse ?? ''} ${master?.hausnr ?? ''}`} />
          <Field label="PLZ / Ort" value={`${master?.plz ?? ''} ${master?.ort ?? ''}`} />
          <Field label="Fahrtroute" value={master?.fahrtroute ?? ''} />
          <Field label="Verkehrsmittel" value={record.ticketType === 'PKW' ? `PKW (${master?.kennzeichen ?? ''})` : 'ÖPNV'} />
        </div>

        <div className="mt-6 border-t border-line pt-4 text-sm">
          <Eyebrow>{GERMAN_MONTHS[month - 1]} {year} · TN {record.participantId}</Eyebrow>
          {record.ticketType === 'PKW' ? (
            <Row label={view.result.trace.pkw?.formula ?? 'PKW km-Formel'} value={formatEuro(view.result.amountEur)} />
          ) : (
            <>
              <Row
                label={`Deutschlandticket${record.ticketPriceEur !== 49 ? ' (Sozialticket)' : ''}`}
                value={formatEuro(record.ticketPriceEur)}
              />
              {view.result.method === 'VMT_SINGLE_FARES' && view.result.trace.vmt && (
                <Row label={`Vergleichsrechnung VMT: ${view.result.trace.vmt.formula} ✓ günstiger`} value={formatEuro(view.result.trace.vmt.amountEur)} />
              )}
              <Row
                label={`Abzug Anwesenheit (${view.attendance.reimbursableDays}/${record.workdaysInMonth} Tage — ${view.result.trace.proRata?.formula ?? ''})`}
                value={`−${formatEuro(Math.max(0, record.ticketPriceEur - view.result.amountEur))}`}
              />
            </>
          )}
          <div className="mt-2 flex justify-between border-t border-ink pt-2 font-bold">
            <span>Betrag gesamt</span>
            <span>{view.result.eligible ? formatEuro(view.result.amountEur) : '0,00 €'}</span>
          </div>
          <p className="mt-2 text-xs">
            {view.result.phrases.join(' · ')}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-line pt-4 text-sm">
          <Field label="Kontoinhaber" value={master?.kontoinhaber || `${master?.vorname ?? ''} ${master?.nachname ?? ''}`} />
          <Field label="IBAN" value={master?.iban ?? ''} />
          <Field label="Bank" value={master?.bank ?? ''} />
          <Field label="BIC" value={master?.bic ?? ''} />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-ink-dim">
          <p>Erfurt, {new Date().toLocaleDateString('de-DE')}</p>
          <p className="border-t border-ink pt-1">
            Unterschrift TN {record.signature.signedAt ? `— ${record.signature.mode === 'PAPER' ? 'Papier liegt vor' : 'digital bestätigt'} ✓` : '— ausstehend'}
          </p>
        </div>
      </div>

      {/* ── validation rail ── */}
      <div className="space-y-3 print:hidden">
        <Link to={`/admin/tn/${record.participantId}`} className="text-sm font-semibold text-primary underline">
          ← TN-Detail
        </Link>
        <Card>
          <Eyebrow>Prüfungen</Eyebrow>
          <ul className="mt-2 space-y-2 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2">
                <span className={c.ok ? 'text-success' : 'text-danger'}>{c.ok ? '✓' : '✗'}</span>
                <span>
                  <strong>{c.label}</strong>
                  <span className="block text-xs text-ink-dim">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <PrimaryButton onClick={save} disabled={!allGreen || !formularContext} className="w-full">
          Formular speichern → daten/formulare/{year}-{String(month).padStart(2, '0')}/
        </PrimaryButton>
        {!allGreen && (
          <p className="text-xs text-danger">
            Speichern erst möglich, wenn alle Prüfungen grün sind — Korrekturen an der Quelle,
            das Formular erzeugt sich neu.
          </p>
        )}
        {!formularContext && (
          <p className="text-xs text-ink-dim">
            Vorlage fehlt: Projektordner mit daten/vorlagen/ öffnen (Einstellungen → Datenquelle).
          </p>
        )}
        <SecondaryButton onClick={() => window.print()} className="w-full">
          Drucken / als PDF sichern
        </SecondaryButton>
        {savedPath && <p className="text-sm font-semibold text-success">Gespeichert: {savedPath}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="block text-xs uppercase tracking-wide text-ink-dim">{label}</span>
      <span className="block min-h-5 border-b border-line">{value || '\u00A0'}</span>
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1 flex justify-between gap-4">
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}
