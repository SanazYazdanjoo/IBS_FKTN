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
import { getMaster } from '../../adapters/masters';
import { GERMAN_MONTHS } from '../../adapters/excel/attendanceWorkbook';
import type { MonthRecord } from '../../domain/types';

export default function FormularScreen() {
  const { participantId } = useParams<{ participantId: string }>();
  const { user, storage, formularContext, month: MONTH } = useSession();
  const { rules } = useRules();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [savedPath, setSavedPath] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!participantId) return;
    storage.getMonthRecord(user, participantId, MONTH).then(setRecord).catch((e) => setError(e.message));
  }, [participantId, user, storage, MONTH]);

  const month = Number(MONTH.split('-')[1]);
  const year = Number(MONTH.split('-')[0]);

  const data: FormularData | null = useMemo(() => {
    if (!record) return null;
    const view = computeMonthView(record, rules, vmtSingleFaresEur[record.participantId]);
    const master = getMaster(storage, record.participantId);
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

  const nachname = master?.nachname || record.participantName.split(' ').slice(-1)[0];
  const vorname = master?.vorname || record.participantName.split(' ').slice(0, -1).join(' ');
  const reiseantritt = `01.${String(month).padStart(2, '0')}.${year}`;
  const letzterTag = new Date(year, month, 0).getDate();
  const reiseende = `${letzterTag}.${String(month).padStart(2, '0')}.${year}`;

  // Fahrpreis-Positionen — spiegelt die Zeilen der Papiervorlage:
  // Eisenbahn/Bus/S-Bahn, optional VMT-Vergleich, PKW-Kilometerzeile.
  const fareLines: { label: string; value: string }[] = [];
  if (record.ticketType === 'PKW') {
    fareLines.push({
      label: view.result.trace.pkw?.formula ?? `${view.attendance.reimbursableDays} Tage × ${record.distanceKm} km × 2 × 0,20 €/km`,
      value: view.result.eligible ? formatEuro(view.result.amountEur) : '0,00 €',
    });
  } else {
    fareLines.push({
      label: `Eisenbahn*, Bus*/S-Bahn* — Deutschlandticket${record.ticketPriceEur !== 49 ? ' (Sozialticket)' : ''}`,
      value: formatEuro(record.ticketPriceEur),
    });
    if (view.result.method === 'VMT_SINGLE_FARES' && view.result.trace.vmt) {
      fareLines.push({
        label: `Vergleichsrechnung VMT: ${view.result.trace.vmt.formula} ✓ günstiger`,
        value: formatEuro(view.result.trace.vmt.amountEur),
      });
    }
  }
  const abzug =
    record.ticketType === 'PKW'
      ? '0,00 €'
      : `−${formatEuro(Math.max(0, record.ticketPriceEur - view.result.amountEur))}`;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1fr]">
      {/* ── Formular-Vorschau (Druckziel), Layout nach Papiervorlage ── */}
      <div className="print-formular rounded-2xl border border-line bg-white p-8 shadow-sm text-sm">
        <h1 className="text-center font-display text-xl font-bold">Fahrkosten-Abrechnung</h1>
        <p className="mt-1 text-center text-xs text-ink-dim">
          Für Teilnehmer*innen an Schulungen/Maßnahmen im Rahmen des LAT Projekts
          „Qualifizierung SprInt"
        </p>
        <p className="mt-2 text-right text-xs">
          <span className="text-ink-dim">Anlass: </span>Teilnahme an Qualifizierung
        </p>

        {/* Persönliche Daten (links) + Fahrt-Kontext (rechts) — wie in der Vorlage */}
        <div className="mt-4 grid grid-cols-2 gap-x-10 border-t border-line pt-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Name" value={nachname} />
              <Field label="Vorname" value={vorname} />
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Straße" value={master?.strasse ?? ''} />
              <Field label="Hausnr." value={master?.hausnr ?? ''} />
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="PLZ" value={master?.plz ?? ''} />
              <Field label="Ort" value={master?.ort ?? ''} />
            </div>
          </div>
          <div className="space-y-3">
            <Field label="Schulungsort" value="Wallstraße 18, 99084 Erfurt" />
            <Field label="Fahrtroute" value={master?.fahrtroute ?? ''} />
            <Field
              label="Verkehrsmittel"
              value={
                record.ticketType === 'PKW'
                  ? `PKW — bei PKW-Kennzeichen: ${master?.kennzeichen || '___'}`
                  : 'ÖPNV'
              }
            />
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Reiseantritt" value={reiseantritt} />
              <Field label="Reiseende" value={reiseende} />
            </div>
          </div>
        </div>

        {/* Fahrpreis-Tabelle */}
        <div className="mt-6 border-t border-line pt-4">
          {fareLines.map((f) => (
            <Row key={f.label} label={f.label} value={f.value} />
          ))}
          {record.ticketType !== 'PKW' && <Row label="Abzug Anwesenheit" value={abzug} />}
          <div className="mt-2 flex justify-between border-t-2 border-ink pt-2 text-base font-bold">
            <span>Betrag gesamt</span>
            <span>{view.result.eligible ? formatEuro(view.result.amountEur) : '0,00 €'}</span>
          </div>
          <p className="mt-2 text-xs text-ink-dim">{view.result.phrases.join(' · ')}</p>
        </div>

        {/* Bankverbindung + Ort/Datum/Unterschrift */}
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-xs">Ich bitte um Überweisung des festgestellten Betrages auf das Konto:</p>
          <div className="mt-3 grid grid-cols-2 gap-x-10 gap-y-2">
            <Field label="Kontoinhaber" value={master?.kontoinhaber || `${vorname} ${nachname}`.trim()} />
            <Field label="Ort, Datum" value={`Erfurt, ${new Date().toLocaleDateString('de-DE')}`} />
            <Field label="IBAN" value={master?.iban ?? ''} />
            <Field
              label="Unterschrift TN"
              value={
                record.signature.signedAt
                  ? `${record.signature.mode === 'PAPER' ? 'Papier liegt vor' : 'digital bestätigt'} ✓`
                  : ''
              }
            />
            <Field label="Bank" value={master?.bank ?? ''} />
            <Field label="BIC" value={master?.bic ?? ''} />
          </div>
        </div>

        {/* Fußzeile — KST, Belegvermerk, Freigabestempel */}
        <div className="mt-6 border-t border-line pt-3 text-xs">
          <p className="text-center font-semibold">KST: IBS 0098</p>
          <div className="mt-3 flex items-start justify-between gap-6">
            <p>684111 *</p>
            <p className="max-w-[16rem] text-right text-ink-dim">
              * Originalfahrkarten/-belege &amp; Kopie der Anwesenheitsliste bitte beifügen
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-10 gap-y-1">
            <p className="border-t border-ink pt-1">sachlich richtig — zu verbuchen auf Kto.</p>
            <p className="border-t border-ink pt-1">rechnerisch richtig — zur Zahlung angewiesen</p>
          </div>
        </div>
      </div>

      {/* ── validation rail ── */}
      <div className="space-y-3 print:hidden">
        <Link to={`/admin/tn/${record.participantId}`} className="text-sm font-semibold text-primary underline">
          ← TN-Detail
        </Link>
        <p className="text-xs uppercase tracking-wider text-ink-dim">
          {GERMAN_MONTHS[month - 1]} {year} · TN {record.participantId}
        </p>
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
