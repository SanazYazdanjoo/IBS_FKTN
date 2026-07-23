/**
 * Füllt die offizielle Formular-Vorlage (daten/vorlagen/) zellgenau aus;
 * Layout, verbundene Zellen und Druckformat bleiben erhalten.
 * Zellplan: A6/D6 Name/Vorname · A10/D10 Straße/Nr · A14/D14 PLZ/Ort ·
 * J10 Route · J12 Verkehrsmittel · J14 Kennzeichen · K20 Ticket ·
 * K30 PKW · K32 Abzug · K34 Gesamt · B38–B44 Bankdaten · J38 Ort/Datum.
 */
import ExcelJS from 'exceljs';
import { formatEuro, roundEuro } from '../../domain/reimbursement';
import type { MonthView } from '../../domain/compute';
import type { MonthRecord } from '../../domain/types';
import type { MasterData } from './workbook';
import { GERMAN_MONTHS } from './attendanceWorkbook';

export interface FormularData {
  record: MonthRecord;
  view: MonthView;
  master: MasterData | null;
  month: number;
  year: number;
}

export function formularFileName(record: MonthRecord, month: number, year: number): string {
  return `${record.participantId}_Abrechnung_${year}-${String(month).padStart(2, '0')}.xlsx`;
}

export async function fillAbrechnungsformular(
  templateBuffer: ArrayBuffer,
  data: FormularData,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Vorlage ist leer — keine Tabelle gefunden.');

  const { record, view, master, month, year } = data;
  const set = (addr: string, value: ExcelJS.CellValue) => {
    ws.getCell(addr).value = value;
  };

  // Person & address (from master sheet)
  set('A6', master?.nachname || record.participantName.split(' ').slice(-1)[0]);
  set('D6', master?.vorname || record.participantName.split(' ').slice(0, -1).join(' '));
  set('A10', master?.strasse ?? '');
  set('D10', master?.hausnr ?? '');
  set('A14', master?.plz ?? '');
  set('D14', master?.ort ?? '');

  // Travel context
  set('J10', master?.fahrtroute ?? '');
  set('J12', record.ticketType === 'PKW' ? 'PKW' : 'ÖPNV');
  set('J14', record.ticketType === 'PKW' ? (master?.kennzeichen ?? '') : '—');

  const monthLabel = `${GERMAN_MONTHS[month - 1]} ${year}`;
  const days = view.attendance.reimbursableDays;

  if (record.ticketType === 'PKW') {
    // PKW-Zeile
    const pkwTrace = view.result.trace.pkw;
    set('C30', `${monthLabel}: ${days} Tage × ${record.distanceKm} km × 2`);
    set('K30', view.result.eligible ? roundEuro(view.result.amountEur) : 0);
    set('K34', view.result.eligible ? roundEuro(view.result.amountEur) : 0);
    if (pkwTrace) set('A20', `PKW-Fahrten (${pkwTrace.formula})`);
  } else {
    // Ticketzeile: voller Preis, Abzug über Anwesenheit.
    set('C20', `Deutschlandticket ${monthLabel}${record.ticketPriceEur !== 49 ? ' (Sozialticket)' : ''}`);
    set('K20', record.ticketPriceEur);
    const deduction = roundEuro(record.ticketPriceEur - view.result.amountEur);
    // Beschreibungszeile unter "Abzug Anwesenheit".
    set('A33', `${days}/${record.workdaysInMonth} Anwesenheitstage — ${view.result.trace.proRata?.formula ?? ''}`);
    set('K32', view.result.eligible ? -deduction : -record.ticketPriceEur);
    set('K34', view.result.eligible ? roundEuro(view.result.amountEur) : 0);
    if (view.result.trace.vmt && view.result.method === 'VMT_SINGLE_FARES') {
      set('C24', `Vergleichsrechnung VMT: ${view.result.trace.vmt.formula} = ${formatEuro(view.result.trace.vmt.amountEur)} (günstiger)`);
    }
  }

  // Bank block
  set('B38', master?.kontoinhaber || `${master?.vorname ?? ''} ${master?.nachname ?? ''}`.trim());
  set('B40', master?.iban ?? '');
  set('B42', master?.bank ?? '');
  set('B44', master?.bic ?? '');
  set('J38', `Erfurt, ${new Date().toLocaleDateString('de-DE')}`);

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Prüfungen; Speichern nur, wenn alle bestanden sind. */
export interface FormularCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export function formularChecks(data: FormularData): FormularCheck[] {
  const { record, view } = data;
  const docsOk =
    record.documents.length > 0 &&
    record.documents.every((d) => d.state === 'VERIFIED' || d.state === 'UPLOADED');
  const attendanceOk =
    record.attendance.length > 0
      ? view.attendance.openGaps === 0
      : record.attendanceDaysOverride !== undefined;
  const amountsOk = view.amountMismatch === null && view.result.blockers.length === 0;
  const signatureOk = record.signature.signedAt !== undefined;
  return [
    {
      label: 'Belege vollständig',
      ok: docsOk,
      detail: docsOk ? 'alle Nachweise liegen vor' : 'Nachweise fehlen oder sind unleserlich',
    },
    {
      label: 'Anwesenheit vollständig',
      ok: attendanceOk,
      detail: attendanceOk
        ? 'keine offenen Lücken'
        : record.attendance.length > 0
          ? `${view.attendance.openGaps} Lücke(n) in der Liste`
          : 'keine Anwesenheitsdaten',
    },
    {
      label: '3-km-Regel / Berechnung',
      ok: view.result.eligible && view.result.blockers.length === 0,
      detail: view.result.eligible ? view.result.phrases[0] : 'nicht erstattungsfähig ohne Ausnahme',
    },
    {
      label: 'Beträge stimmen überein',
      ok: amountsOk,
      detail: amountsOk
        ? 'Excel = Engine'
        : view.amountMismatch
          ? `Excel ${formatEuro(view.amountMismatch.excel)} ≠ Engine ${formatEuro(view.amountMismatch.engine)}`
          : (view.result.blockers[0] ?? ''),
    },
    {
      label: 'Unterschrift TN',
      ok: signatureOk,
      detail: signatureOk ? `vorhanden (${record.signature.mode === 'PAPER' ? 'Papier' : 'digital'})` : 'ausstehend',
    },
  ];
}
