/**
 * TN-Detail (Admin) — Reihenfolge:
 *   1) TN-Name groß + fett (in Kursfarbe, mit ID-Badge)
 *   2) Stammdaten (aus dem Tab „Alle_TN_Daten")
 *   3) Alle Monate 2026 — jede Zeile anklickbar
 *   4) Details zum gewählten Monat: Belege, Anwesenheit, 3-km-Regel,
 *      Abrechnung + Button „Formular ansehen"
 *   5) Ausnahmen (bezogen auf den gewählten Monat)
 *
 * Der aktuelle Monat aus der globalen Auswahl (Header/Kontextbox) ist die
 * Voreinstellung; Klick auf eine Monatszeile wechselt lokal, ohne andere
 * Ansichten zu beeinflussen. „Formular ansehen" setzt den globalen Monat
 * mit, damit das gerenderte Formular zur Auswahl passt.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { useVmtFares } from '../../app/vmt-fares-context';
import {
  Card,
  CheckItem,
  ExceptionFlag,
  Eyebrow,
  FormulaBox,
  KnownFlag,
  PrimaryButton,
  SecondaryButton,
  TnName,
  statusColorClass,
  statusLabel,
} from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { formatEuro } from '../../domain/reimbursement';
import { toFareLookup } from '../../domain/vmtFares';
import { MONTHS, monthLabel } from '../../adapters/mock/seed';
import { getMaster } from '../../adapters/masters';
import { logChange } from '../../app/auditLog';
import type { ExceptionCategory, MonthRecord, ProofKind } from '../../domain/types';

function attendanceDaysLabel(days: number): string {
  return days > 0 ? String(days) : '?';
}

const PROOF_LABELS: Record<ProofKind, string> = {
  TICKET_PHOTO: 'Ticket',
  PAYMENT_PROOF: 'Kontoauszug',
  INVOICE: 'Rechnung',
  LICENSE_PLATE: 'Kennzeichen',
  GENERAL_INFO: 'Allgemeine Info',
  PRAKTIKUM_CONTRACT: 'Praktikumsvertrag',
  DISTANCE_PROOF: 'Entfernungsnachweis',
};

export default function TnDetail() {
  const { participantId } = useParams<{ participantId: string }>();
  const { user, storage, month: MONTH, setMonth: setGlobalMonth } = useSession();
  const { rules } = useRules();
  const { fares } = useVmtFares();
  const vmtSingleFaresEur = toFareLookup(fares);
  const [allMonths, setAllMonths] = useState<(MonthRecord | null)[]>([]);
  const [selectedYm, setSelectedYm] = useState<string>(MONTH);
  const [loading, setLoading] = useState(true);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  const selectMonth = (ym: string) => {
    setSelectedYm(ym);
    setJustSelected(true);
    window.setTimeout(
      () => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      0,
    );
    window.setTimeout(() => setJustSelected(false), 1200);
  };

  useEffect(() => {
    if (!participantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      MONTHS.map((m) => storage.getMonthRecord(user, participantId, m.ym).catch(() => null)),
    ).then((records) => {
      setAllMonths(records);
      setLoading(false);
    });
  }, [participantId, user, storage]);

  // Beim Wechsel des globalen Monats gleiche die lokale Auswahl an.
  useEffect(() => setSelectedYm(MONTH), [MONTH]);

  if (loading) return <p className="text-ink-dim">Lädt…</p>;
  if (!participantId) return <p className="text-ink-dim">Kein TN.</p>;

  const master = getMaster(storage, participantId);
  const idx = MONTHS.findIndex((m) => m.ym === selectedYm);
  const record = idx >= 0 ? allMonths[idx] : null;

  // Anzeigename: Stammdaten haben Vorrang, sonst aus einem Monatsrecord.
  const anyRecord = allMonths.find((r): r is MonthRecord => r !== null);
  const displayName =
    (master && [master.vorname, master.nachname].filter(Boolean).join(' ')) ||
    anyRecord?.participantName ||
    participantId;

  const updateRecord = (next: MonthRecord) => {
    setAllMonths((prev) => prev.map((r, i) => (i === idx ? next : r)));
  };

  const persist = async (next: MonthRecord) => {
    await storage.saveMonthRecord(user, next);
    updateRecord(next);
  };

  const flagIllegible = async (kind: ProofKind) => {
    if (!record) return;
    const docs = record.documents.map((d) =>
      d.kind === kind
        ? {
            ...d,
            state: 'ILLEGIBLE' as const,
            correctionReason: 'Das Foto ist zu dunkel — der Betrag ist nicht lesbar.',
          }
        : d,
    );
    await persist({ ...record, documents: docs, status: 'AWAITING_CORRECTION' });
    logChange(
      user.name,
      `Beleg als unleserlich markiert: ${record.participantId} · ${monthLabel(selectedYm)} · ${PROOF_LABELS[kind]}`,
    );
  };

  const verify = async (kind: ProofKind) => {
    if (!record) return;
    const docs = record.documents.map((d) =>
      d.kind === kind ? { ...d, state: 'VERIFIED' as const } : d,
    );
    await persist({ ...record, documents: docs });
    logChange(
      user.name,
      `Beleg bestätigt: ${record.participantId} · ${monthLabel(selectedYm)} · ${PROOF_LABELS[kind]}`,
    );
  };

  const view = record
    ? computeMonthView(record, rules, vmtSingleFaresEur[record.participantId])
    : null;

  return (
    <div className="space-y-6">
      <Link to="/admin" className="text-sm font-semibold text-primary underline">
        ← Dashboard
      </Link>

      {/* 1) TN-Name — groß, fett, mit ID-Badge in Kursfarbe; daneben Cloud-Link, falls hinterlegt */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>TN-Detail</Eyebrow>
          <h1 className="font-display text-4xl font-bold leading-tight">
            <TnName id={participantId} name={displayName} link={false} />
          </h1>
        </div>
        {master?.cloud && (
          <a
            href={master.cloud}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
            title="Cloud-Ordner dieses TN in neuem Tab öffnen"
          >
            <span aria-hidden>☁</span>
            Cloud-Ordner öffnen
            <span aria-hidden>↗</span>
          </a>
        )}
      </div>

      {/* 2) Stammdaten */}
      {master && (
        <Card>
          <Eyebrow>Stammdaten</Eyebrow>
          <div className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <MasterField
              label="Adresse"
              value={[
                [master.strasse, master.hausnr].filter(Boolean).join(' '),
                [master.plz, master.ort].filter(Boolean).join(' '),
              ]
                .filter(Boolean)
                .join(', ')}
            />
            <MasterField label="Fahrtroute" value={master.fahrtroute} />
            <MasterField
              label="Entfernung"
              value={
                master.entfernungKm != null
                  ? `${String(master.entfernungKm).replace('.', ',')} km`
                  : ''
              }
            />
            <MasterField label="VMT-Zone" value={master.vmtZone} />
            <MasterField
              label="Verkehrsmittel"
              value={[master.verkehrsmittel, master.kennzeichen && `(${master.kennzeichen})`]
                .filter(Boolean)
                .join(' ')}
            />
            <MasterField label="Ticket" value={[master.ticket, master.ticketart].filter(Boolean).join(' · ')} />
            <MasterField label="Abo-Nr." value={master.aboNummer} mono />
            {user.role === 'ADMIN' && (
              <>
                <MasterField label="Kontoinhaber" value={master.kontoinhaber} />
                <MasterField label="IBAN" value={master.iban} mono />
                <MasterField label="Bank" value={[master.bank, master.bic].filter(Boolean).join(' · ')} />
              </>
            )}
            <MasterField label="E-Mail" value={master.email} />
            <MasterField label="Bemerkungen" value={master.bemerkungen} />
          </div>
        </Card>
      )}

      {/* 3) Alle Monate — anklickbar */}
      <Card className="overflow-x-auto">
        <Eyebrow>Alle Monate 2026 · Zeile anklicken für Details</Eyebrow>
        <table className="mt-2 min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-dim">
              <th className="pr-3 pb-1">Monat</th>
              <th className="pr-3 pb-1">Status</th>
              <th className="pr-3 pb-1 text-right">Anwesend</th>
              <th className="pr-3 pb-1 text-right">Betrag</th>
              <th className="pr-3 pb-1">Ticket</th>
              <th className="pr-3 pb-1">Rechnung</th>
              <th className="pr-3 pb-1">Kontoauszug</th>
              <th className="pr-3 pb-1">
                <span className="block max-w-[10ch] truncate" title="Praktikumsvertrag">
                  Praktikumsvertrag
                </span>
              </th>
              <th className="pr-3 pb-1">Unterschrift</th>
              <th className="pb-1 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m, i) => {
              const rec = allMonths[i];
              const isSelected = m.ym === selectedYm;
              const isCurrent = m.ym === MONTH;
              if (!rec) {
                return (
                  <tr key={m.ym} className="border-t border-line/60 text-ink-dim">
                    <td className="pr-3 py-1.5">{m.label}</td>
                    <td colSpan={9} className="py-1.5 text-xs">
                      nicht geführt
                    </td>
                  </tr>
                );
              }
              const v = computeMonthView(rec, rules, vmtSingleFaresEur[rec.participantId]);
              const doc = (kind: ProofKind) => {
                const d = rec.documents.find((x) => x.kind === kind);
                if (!d)
                  return (
                    <span className="text-problem-ink font-semibold" title="fehlt">
                      fehlt
                    </span>
                  );
                if (d.state === 'VERIFIED') return <span className="text-win-ink font-semibold">✓</span>;
                if (d.state === 'ILLEGIBLE')
                  return (
                    <span className="text-problem-ink font-semibold" title="unleserlich">
                      ✗
                    </span>
                  );
                if (d.state === 'MISSING')
                  return (
                    <span className="text-problem-ink font-semibold" title="fehlt">
                      fehlt
                    </span>
                  );
                return <span>{d.state === 'UPLOADED' ? '…' : '—'}</span>;
              };
              const rowCls = [
                'cursor-pointer border-t border-line/60 hover:bg-primary/15 hover:ring-1 hover:ring-primary/30 transition',
                isSelected && 'bg-primary/10 font-semibold ring-1 ring-inset ring-primary/40',
                !isSelected && isCurrent && 'bg-highlight-weak/40',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <tr
                  key={m.ym}
                  onClick={() => selectMonth(m.ym)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectMonth(m.ym);
                    }
                  }}
                  className={rowCls}
                >
                  <td className="pr-3 py-1.5">
                    {m.label}
                    {isCurrent && ' ●'}
                  </td>
                  <td className={`pr-3 py-1.5 ${statusColorClass(rec.status)}`}>
                    {statusLabel(rec.status)}
                  </td>
                  <td className="pr-3 py-1.5 text-right">
                    {v.attendance.presenceDays}/{rec.workdaysInMonth}
                  </td>
                  <td className="pr-3 py-1.5 text-right">
                    {v.result.eligible ? formatEuro(v.result.amountEur) : '—'}
                  </td>
                  <td className="pr-3 py-1.5">
                    {doc(rec.ticketType === 'PKW' ? 'LICENSE_PLATE' : 'TICKET_PHOTO')}
                  </td>
                  <td className="pr-3 py-1.5">{doc('INVOICE')}</td>
                  <td className="pr-3 py-1.5">
                    {doc(rec.ticketType === 'PKW' ? 'GENERAL_INFO' : 'PAYMENT_PROOF')}
                  </td>
                  <td className="pr-3 py-1.5">
                    {rec.hasPraktikum ? doc('PRAKTIKUM_CONTRACT') : <span className="text-ink-dim">—</span>}
                  </td>
                  <td className="pr-3 py-1.5">
                    {rec.signature.signedAt ? `✓ ${rec.signature.signedAt}` : 'offen'}
                  </td>
                  <td className="py-1.5 text-right">
                    <Link
                      to={`/admin/tn/${participantId}/formular`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedYm(m.ym);
                        setGlobalMonth(m.ym);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
                      title={`Formular für ${m.label} ansehen`}
                    >
                      Formular
                      <span aria-hidden>→</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-dim">
          ● = aktueller Monat (globale Auswahl) · Klick auf Zeile öffnet Monatsdetails unten.
        </p>
      </Card>

      {/* 4) Monatsdetails: nur wenn Datensatz existiert */}
      <div ref={detailsRef} className="scroll-mt-6">
      {record && view ? (
        <section
          aria-label={`Details für ${monthLabel(selectedYm)} 2026`}
          className={`space-y-4 rounded-3xl border-2 bg-primary/5 p-4 transition-all duration-500 ${
            justSelected ? 'border-primary ring-4 ring-primary/40' : 'border-primary/40'
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">{monthLabel(selectedYm)} 2026</h2>
            <div className="text-sm">
              {record.ticketType === 'ABO' ? 'Deutschlandticket' : record.ticketType}{' '}
              {formatEuro(record.ticketPriceEur)}{' · Status: '}
              <span className={statusColorClass(record.status)}>{statusLabel(record.status)}</span>
              {record.signature.signedAt &&
                ` · Unterschrift ✓ (${
                  record.signature.mode === 'PAPER' ? 'Papier' : 'Digital'
                })`}
            </div>
          </div>

          {/* Belege — kompakt nebeneinander, jeder Beleg ein Chip */}
          <Card>
            <Eyebrow>
              Belege {record.documents.filter((d) => d.state !== 'MISSING').length}/
              {record.documents.length}
            </Eyebrow>
            <ul className="mt-2 flex flex-wrap gap-2">
              {record.documents.map((doc) => (
                <li
                  key={doc.kind}
                  className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
                >
                  <CheckItem ok={doc.state === 'VERIFIED' || doc.state === 'UPLOADED'}>
                    <span className="font-semibold">{PROOF_LABELS[doc.kind]}</span>
                  </CheckItem>
                  {doc.state === 'ILLEGIBLE' && (
                    <span className="text-xs text-problem-ink font-semibold">unleserlich</span>
                  )}
                  {doc.state === 'MISSING' && (
                    <span className="text-xs text-problem-ink font-semibold">fehlt</span>
                  )}
                  {doc.state === 'UPLOADED' && (
                    <span className="flex gap-1">
                      <button
                        onClick={() => verify(doc.kind)}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold hover:bg-primary hover:text-white"
                        title={`${PROOF_LABELS[doc.kind]}: als lesbar bestätigen`}
                      >
                        lesbar ✓
                      </button>
                      <button
                        onClick={() => flagIllegible(doc.kind)}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold hover:bg-problem-ink hover:text-white"
                        title={`${PROOF_LABELS[doc.kind]}: als unleserlich markieren`}
                      >
                        unleserlich
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {/* Anwesenheit — kompakt: eine Zahl + Button zur Liste des Monats */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Eyebrow>Anwesenheit</Eyebrow>
                <p className="mt-1 text-sm">
                  <strong>{view.attendance.presenceDays}</strong> von{' '}
                  <strong>{record.workdaysInMonth}</strong> Arbeitstagen anwesend
                </p>
              </div>
              <Link
                to="/dozent"
                onClick={() => setGlobalMonth(selectedYm)}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                Zur Anwesenheitsliste ({monthLabel(selectedYm)})
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Card>

          {/* 3-km-Regel */}
          <Card>
            <Eyebrow>3-km-Regel</Eyebrow>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
              <MasterField
                label="Entfernung"
                value={
                  master?.entfernungKm != null
                    ? `${String(master.entfernungKm).replace('.', ',')} km`
                    : record.distanceKm > 0
                    ? `${String(record.distanceKm).replace('.', ',')} km`
                    : 'nicht dokumentiert'
                }
              />
              <MasterField label="Fahrtroute" value={master?.fahrtroute ?? ''} />
              <div>
                <span className="text-xs text-ink-dim">Ergebnis: </span>
                {view.result.eligible ? (
                  <span className="font-semibold text-win-ink">
                    erstattungsfähig (≥ 3 km)
                  </span>
                ) : (
                  <span className="font-semibold text-problem-ink">
                    &lt; 3 km — nicht erstattungsfähig (Ausnahme mit Begründung möglich)
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Abrechnung */}
          <Card>
            <Eyebrow>Abrechnung · automatisch</Eyebrow>
            {view.result.method === 'NONE' ? (
              <p className="mt-2 rounded-lg bg-blush-weak p-2 text-sm">
                Keine Abrechnung möglich —{' '}
                {view.result.blockers[0] ?? 'Voraussetzungen nicht erfüllt.'}
              </p>
            ) : view.result.method === 'PKW_KM' ? (
              /* PKW: km-Formel · Anwesenheitstage × Entfernung × 2 × €/km */
              <div className="mt-2">
                <FormulaBox
                  label="PKW · km-Formel"
                  terms={[
                    {
                      name: 'Anwesenheitstage',
                      value: attendanceDaysLabel(view.attendance.reimbursableDays),
                    },
                    {
                      name: 'Entfernung',
                      value: `${String(record.distanceKm).replace('.', ',')} km`,
                      op: '×',
                    },
                    { name: 'Hin- & Rückfahrt', value: '2', op: '×' },
                    {
                      name: '€/km',
                      value: formatEuro(rules.pkwRatePerKmEur),
                      op: '×',
                    },
                  ]}
                  result={formatEuro(view.result.trace.pkw?.amountEur ?? view.result.amountEur)}
                />
              </div>
            ) : view.result.trace.vmt && view.result.trace.proRata ? (
              /* ÖPNV mit Vergleichsrechnung: A (Abo pro rata) vs. B (VMT-Einzelfahrten) */
              <div className="mt-2 space-y-4">
                <FormulaBox
                  label="A · Anteiliges Abo"
                  terms={[
                    { name: 'Ticketpreis', value: formatEuro(record.ticketPriceEur) },
                    { name: 'Arbeitstage', value: String(record.workdaysInMonth), op: '÷' },
                    {
                      name: 'Anwesenheitstage',
                      value: attendanceDaysLabel(view.attendance.reimbursableDays),
                      op: '×',
                    },
                  ]}
                  result={formatEuro(view.result.trace.proRata.amountEur)}
                />
                <FormulaBox
                  label={`B · VMT-Einzelfahrten${
                    view.result.method === 'VMT_SINGLE_FARES' ? ' ✓ günstiger' : ''
                  }`}
                  raw={view.result.trace.vmt.formula}
                  result={formatEuro(view.result.trace.vmt.amountEur)}
                />
                {view.result.trace.chosenBecause && (
                  <p className="text-sm text-ink-dim">{view.result.trace.chosenBecause}</p>
                )}
              </div>
            ) : view.result.trace.proRata ? (
              /* Standardfall ÖPNV: Anteiliges Abo */
              <div className="mt-2">
                <FormulaBox
                  terms={[
                    { name: 'Ticketpreis', value: formatEuro(record.ticketPriceEur) },
                    { name: 'Arbeitstage', value: String(record.workdaysInMonth), op: '÷' },
                    {
                      name: 'Anwesenheitstage',
                      value: attendanceDaysLabel(view.attendance.reimbursableDays),
                      op: '×',
                    },
                  ]}
                  result={formatEuro(view.result.trace.proRata.amountEur)}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-dim">
                Keine Formel-Details verfügbar — Endbetrag:{' '}
                <strong>{formatEuro(view.result.amountEur)}</strong>
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-1">
              {!view.result.comparisonTriggered && view.result.method === 'PRO_RATA' && (
                <KnownFlag>Vergleich: nicht nötig</KnownFlag>
              )}
            </div>
            {view.result.phrases[0] && (
              <p className="mt-3 rounded-lg bg-muted p-2 text-sm font-semibold">
                {view.result.phrases[0]}
              </p>
            )}
            {view.amountMismatch && (
              <p className="mt-2 rounded-lg bg-blush-weak p-2 text-sm text-problem-ink">
                ≠ In der Excel steht {formatEuro(view.amountMismatch.excel)}, die Engine berechnet{' '}
                {formatEuro(view.amountMismatch.engine)} — bitte klären, bevor bestätigt wird.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <PrimaryButton
                onClick={() => {
                  persist({ ...record, status: 'READY_FOR_APPROVAL' });
                  logChange(
                    user.name,
                    `Status geändert: ${record.participantId} · ${monthLabel(selectedYm)} · ${statusLabel(
                      record.status,
                    )} → ${statusLabel('READY_FOR_APPROVAL')}`,
                  );
                }}
              >
                Bestätigen → an die Leitung
              </PrimaryButton>
              <Link
                to={`/admin/tn/${record.participantId}/formular`}
                onClick={() => setGlobalMonth(selectedYm)}
                className="rounded-full border border-line bg-surface px-5 py-2 font-semibold text-ink transition hover:border-primary hover:text-primary"
              >
                Formular ansehen →
              </Link>
            </div>
          </Card>

          {/* Ausnahmen — bezogen auf den gewählten Monat */}
          <Card>
            <div className="flex items-center justify-between">
              <Eyebrow>Ausnahme vermerken · sichtbar für Team, nie versteckt</Eyebrow>
              <SecondaryButton onClick={() => setShowExceptionForm((v) => !v)}>
                {showExceptionForm ? 'Abbrechen' : 'Ausnahme vermerken'}
              </SecondaryButton>
            </div>
            {record.exceptions.map((ex) => (
              <div key={ex.id} className="mt-2 flex items-center gap-2">
                <ExceptionFlag category={ex.category} />
                <span className="text-sm">
                  „{ex.reason}" · vermerkt von {ex.createdBy} ·{' '}
                  {ex.approvedByManager ? 'genehmigt' : 'Genehmigung ausstehend'}
                </span>
              </div>
            ))}
            {showExceptionForm && (
              <ExceptionForm
                onSubmit={async (category, reason) => {
                  await storage.addException(user, record.participantId, selectedYm, {
                    id: `ex-${Date.now()}`,
                    category,
                    reason,
                    createdBy: user.id,
                    createdAt: new Date().toISOString(),
                    visibility: 'TEAM',
                    approvedByManager: false,
                  });
                  const refreshed = await storage.getMonthRecord(
                    user,
                    record.participantId,
                    selectedYm,
                  );
                  if (refreshed) updateRecord(refreshed);
                  setShowExceptionForm(false);
                  logChange(
                    user.name,
                    `Ausnahme vermerkt: ${record.participantId} · ${monthLabel(selectedYm)} · ${category} — „${reason}"`,
                  );
                }}
              />
            )}
            <p className="mt-2 text-xs text-ink-dim">
              erscheint als Flag im Dashboard, blockiert die Stapel-Freigabe
            </p>
          </Card>
        </section>
      ) : (
        <Card>
          <p className="text-sm text-ink-dim">
            Für {monthLabel(selectedYm)} 2026 liegen keine Daten vor.
          </p>
        </Card>
      )}
      </div>
    </div>
  );
}

function ExceptionForm({
  onSubmit,
}: {
  onSubmit: (category: ExceptionCategory, reason: string) => void;
}) {
  const [category, setCategory] = useState<ExceptionCategory>('FRIST');
  const [reason, setReason] = useState('');

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-line p-3">
      <label className="block text-sm font-semibold">Kategorie</label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as ExceptionCategory)}
        className="w-full rounded-lg border border-line p-2 text-sm"
      >
        <option value="FRIST">Frist</option>
        <option value="NACHWEIS">Nachweis</option>
        <option value="BERECHNUNG">Berechnung</option>
        <option value="SONSTIGES">Sonstiges</option>
      </select>
      <label className="block text-sm font-semibold">Begründung (Pflicht)</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-line p-2 text-sm"
        placeholder="z. B. Upload erst am 16.07. — Krankenhausaufenthalt, Nachweis liegt vor."
      />
      <p className="text-xs text-ink-dim">Sichtbarkeit · Genehmigung: Team · die Leitung (Pflicht)</p>
      <PrimaryButton
        disabled={reason.trim().length === 0}
        onClick={() => onSubmit(category, reason.trim())}
      >
        Ausnahme vermerken
      </PrimaryButton>
    </div>
  );
}

function MasterField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <p>
      <span className="text-xs text-ink-dim">{label}: </span>
      <span className={mono ? 'font-mono text-xs' : ''}>{value || '—'}</span>
    </p>
  );
}

