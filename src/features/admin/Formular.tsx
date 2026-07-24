/**
 * Abrechnungsformular: automatisch befüllte Vorschau mit Prüfungen.
 * Speichern nur bei bestandenen Prüfungen; Ablage unter daten/formulare/.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { formatEuro } from '../../domain/reimbursement';
import { vmtSingleFaresEur } from '../../adapters/mock/seed';
import { mm, PAGE_W_PT, PAGE_H_PT } from './formularLayout';
import { logChange } from '../../app/auditLog';
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
      logChange(
        user.name,
        `Formular gespeichert: ${record.participantId} · ${GERMAN_MONTHS[month - 1]} ${year} → ${path}`,
      );
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
      {/* ── Formular-Vorschau (Druckziel) — Koordinaten aus der echten Vorlage ── */}
      <div className="a4-page-shell overflow-auto rounded-2xl border border-line bg-muted p-4 shadow-sm print:m-0 print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div
          className="print-formular relative mx-auto bg-white"
          style={{
            width: mm(PAGE_W_PT),
            height: mm(PAGE_H_PT),
            fontFamily: 'Calibri, Carlito, Arial, sans-serif',
            color: '#111',
            fontSize: '9.5pt',
          }}
        >
          {/* Titel */}
          <p className="absolute left-0 right-0 text-center font-bold" style={{ top: mm(56), fontSize: '17pt' }}>
            Fahrkosten-Abrechnung
          </p>
          <p className="absolute left-0 right-0 text-center font-semibold" style={{ top: mm(86), fontSize: '10.5pt' }}>
            Für Teilnehmer*innen an Schulungen/Maßnahmen im Rahmen des LAT Projekts
          </p>
          <p className="absolute left-0 right-0 text-center font-semibold" style={{ top: mm(104), fontSize: '10.5pt' }}>
            „Qualifizierung SprInt"
          </p>

          {/* Anlass (rechte Spalte, statisch) */}
          <Static x={299.4} y={140.2}>Anlass:</Static>
          <Static x={378.9} y={140.2}>Teilnahme an Qualifizierung</Static>

          {/* Linke Spalte: Name/Vorname · Straße/Hausnr. · PLZ/Ort — Wert auf der Zeile darüber */}
          <ValueLine x={52.7} y={136} value={nachname} />
          <ValueLine x={168.2} y={136} value={vorname} />
          <Static x={52.7} y={162.8}>Name</Static>
          <Static x={168.2} y={162.8}>Vorname</Static>

          <ValueLine x={52.7} y={183} value={master?.strasse ?? ''} />
          <ValueLine x={168.2} y={183} value={master?.hausnr ?? ''} />
          <Static x={52.7} y={210.8}>Straße</Static>
          <Static x={168.2} y={210.8}>Hausnr.</Static>

          <ValueLine x={52.7} y={231} value={master?.plz ?? ''} />
          <ValueLine x={168.2} y={231} value={master?.ort ?? ''} />
          <Static x={52.7} y={258.8}>PLZ</Static>
          <Static x={168.2} y={258.8}>Ort</Static>

          {/* Rechte Spalte: Schulungsort · Fahrtroute · Verkehrsmittel · Reiseantritt/-ende */}
          <Static x={299.4} y={162.8}>Schulungsort:</Static>
          <Static x={378.9} y={162.8}>Wallstraße 18, 99084 Erfurt</Static>

          <Static x={299.4} y={186.8}>Fahrtroute:</Static>
          <Static x={378.9} y={186.8}>{master?.fahrtroute || '—'}</Static>

          <Static x={299.4} y={210.8}>Verkehrsmittel:</Static>
          <Static x={378.9} y={210.8}>{record.ticketType === 'PKW' ? 'PKW' : 'ÖPNV'}</Static>
          {record.ticketType === 'PKW' && (
            <>
              <Static x={299.4} y={236.7}>bei PKW-Kennzeichen:</Static>
              <Static x={429.1} y={236.7}>{master?.kennzeichen || '___'}</Static>
            </>
          )}

          <Static x={299.4} y={258.8}>Reiseantritt:</Static>
          <Static x={378.9} y={258.8}>{reiseantritt}</Static>
          <Static x={299.4} y={282.8}>Reiseende:</Static>
          <Static x={378.9} y={282.8}>{reiseende}</Static>

          {/* Fahrpreis-Zeilen — gleiche Zeilenabstände (22,5pt) wie in der Vorlage */}
          {fareLines.map((f, i) => (
            <FareRow key={f.label} y={315.5 + i * 22.5} label={f.label} value={f.value} />
          ))}
          {record.ticketType !== 'PKW' && (
            <FareRow y={450.5} label="Abzug Anwesenheit" value={abzug} />
          )}

          {/* Betrag gesamt — fett, mit Trennlinie darüber wie im Original */}
          <div
            className="absolute border-t-2 border-black font-bold"
            style={{ left: mm(299.4), top: mm(483), width: mm(497.4 - 299.4), fontSize: '11pt', paddingTop: '1mm' }}
          >
            Betrag gesamt
          </div>
          <div
            className="absolute border-t-2 border-black text-right font-bold"
            style={{ left: mm(380), top: mm(483), width: mm(103), fontSize: '11pt', paddingTop: '1mm' }}
          >
            {view.result.eligible ? formatEuro(view.result.amountEur) : '0,00 €'}
          </div>
          <p className="absolute" style={{ left: mm(52.6), top: mm(504), width: mm(445), fontSize: '8pt', color: '#555' }}>
            {view.result.phrases.join(' · ')}
          </p>

          {/* Überweisung */}
          <p className="absolute" style={{ left: mm(52.6), top: mm(521.8), fontSize: '9.5pt' }}>
            Ich bitte um Überweisung des festgestellten Betrages auf das Konto:
          </p>

          <Static x={52.6} y={548.2}>Kontoinhaber:</Static>
          <Static x={116.4} y={548.2}>{master?.kontoinhaber || `${vorname} ${nachname}`.trim()}</Static>
          <Static x={378.9} y={548.2}>{`Erfurt, ${new Date().toLocaleDateString('de-DE')}`}</Static>

          <Static x={52.6} y={572.2}>IBAN:</Static>
          <Static x={116.4} y={572.2}>{master?.iban || '—'}</Static>
          <Static x={378.9} y={572.2}>Ort, Datum</Static>

          <Static x={52.6} y={596.2}>BANK:</Static>
          <Static x={116.4} y={596.2}>{master?.bank || '—'}</Static>

          <Static x={52.6} y={620.2}>BIC</Static>
          <Static x={116.4} y={620.2}>{master?.bic || '—'}</Static>
          <Static x={378.9} y={620.2}>
            {`Unterschrift TN${
              record.signature.signedAt
                ? ` — ${record.signature.mode === 'PAPER' ? 'Papier liegt vor' : 'digital bestätigt'} ✓`
                : ' — ausstehend'
            }`}
          </Static>

          {/* Fußzeile */}
          <p className="absolute left-0 right-0 text-center font-semibold" style={{ top: mm(662.2), fontSize: '9pt' }}>
            KST: IBS 0098
          </p>
          <Static x={168.1} y={684}>684111</Static>
          <p
            className="absolute text-right"
            style={{ left: mm(325.6), top: mm(690), width: mm(497.4 - 325.6), fontSize: '8pt', color: '#555' }}
          >
            * Originalfahrkarten/-belege &amp; Kopie der Anwesenheitsliste bitte beifügen
          </p>

          <div className="absolute border-t border-black" style={{ left: mm(52.6), top: mm(700.7), width: mm(100) }} />
          <div className="absolute border-t border-black" style={{ left: mm(168.1), top: mm(700.7), width: mm(150) }} />
          <Static x={52.6} y={702}>sachlich richtig</Static>
          <Static x={168.1} y={702}>zu verbuchen auf Kto.</Static>

          <div className="absolute border-t border-black" style={{ left: mm(52.6), top: mm(754), width: mm(100) }} />
          <div className="absolute border-t border-black" style={{ left: mm(168.1), top: mm(754), width: mm(150) }} />
          <Static x={52.6} y={755.3}>rechnerisch richtig</Static>
          <Static x={168.1} y={755.3}>zur Zahlung angewiesen</Static>
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

/** Statischer Text an gemessener Position (PDF-Punkte, Ursprung oben links). */
function Static({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <span className="absolute whitespace-nowrap" style={{ left: mm(x), top: mm(y) }}>
      {children}
    </span>
  );
}

/** Handschriftliche „Wert auf der Zeile darüber" (Name/Vorname, Straße/Hausnr., PLZ/Ort). */
function ValueLine({ x, y, value }: { x: number; y: number; value: string }) {
  return (
    <span className="absolute whitespace-nowrap font-semibold" style={{ left: mm(x), top: mm(y) }}>
      {value || '\u00A0'}
    </span>
  );
}

/** Fahrpreis-Zeile: Bezeichnung links, Betrag rechtsbündig vor dem €-Zeichen (wie im Original). */
function FareRow({ y, label, value }: { y: number; label: string; value: string }) {
  return (
    <>
      <span
        className="absolute"
        style={{ left: mm(52.6), top: mm(y), width: mm(430), fontSize: '9pt' }}
      >
        {label}
      </span>
      <span className="absolute text-right" style={{ left: mm(380), top: mm(y - 2), width: mm(103) }}>
        {value.replace(/\s*€$/, '').trim()}
      </span>
      <span className="absolute" style={{ left: mm(485.4), top: mm(y - 2) }}>
        €
      </span>
    </>
  );
}
