/**
 * Alle TN-Daten — Stammdaten-Übersicht, 1:1 aus dem Tab „Alle_TN_Daten" der
 * Hauptdatei (im Demo-Modus aus den Dummy-Stammdaten). Enthält Adresse,
 * Fahrtroute, Ticket- und Bankdaten. Für ADMIN und DOZENT sichtbar —
 * Bankdaten (Kontoinhaber, IBAN, Bank, BIC) bleiben Dozent:innen verborgen.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../app/session';
import { Card, CourseChip, Eyebrow, StatusTag, TnName, courseTypeOf } from '../../app/ui';
import { listMasters } from '../../adapters/masters';
import type { MasterData } from '../../adapters/excel/workbook';

type CourseFilter = 'ALLE' | 'PK' | 'BL';

function fullName(m: MasterData): string {
  return [m.vorname, m.nachname].filter(Boolean).join(' ') || m.tnId;
}

function address(m: MasterData): string {
  const line1 = [m.strasse, m.hausnr].filter(Boolean).join(' ');
  const line2 = [m.plz, m.ort].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

export default function TnData() {
  const { user, storage } = useSession();
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState<CourseFilter>('ALLE');

  const isAdmin = user.role === 'ADMIN';
  const isDozent = user.role === 'DOZENT';
  const canView = isAdmin || isDozent;
  const showBank = isAdmin;
  const masters = useMemo(() => (canView ? listMasters(storage) : []), [storage, canView]);

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-ink-dim">
          Diese Ansicht (Adress- und Bankdaten) ist nur für Admins und Dozent:innen zugänglich.
        </p>
      </Card>
    );
  }


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return masters.filter((m) => {
      if (course !== 'ALLE' && courseTypeOf(m.tnId) !== course) return false;
      if (!q) return true;
      return [m.tnId, m.nachname, m.vorname, m.ort, m.iban, m.kennzeichen, m.email]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [masters, query, course]);

  const pk = masters.filter((m) => courseTypeOf(m.tnId) === 'PK').length;
  const bl = masters.filter((m) => courseTypeOf(m.tnId) === 'BL').length;

  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Stammdaten · Tab „Alle_TN_Daten"</Eyebrow>
        <h1 className="text-2xl font-bold">Alle TN-Daten</h1>
        <p className="text-sm text-ink-dim">
          {masters.length} TN ({pk} PK / {bl} BL) · Adresse, Fahrtroute, Ticketdaten
          {showBank ? ' und Bankdaten' : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen: Name, ID, Ort, IBAN, Kennzeichen …"
          className="w-72 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          aria-label="TN-Daten durchsuchen"
        />
        {(['ALLE', 'PK', 'BL'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCourse(c)}
            className={`rounded-full px-3 py-1 text-sm ${
              course === c ? 'bg-primary text-white' : 'bg-muted text-ink-dim hover:bg-ink/10'
            }`}
          >
            {c === 'ALLE' ? `Alle (${masters.length})` : c === 'PK' ? `PK Präsenz (${pk})` : `BL Blended (${bl})`}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto !p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-dim">
              {[
                'TN-ID',
                'Name',
                'Adresse',
                'Fahrtroute',
                'km',
                'VMT-Zone',
                'Verkehrsmittel',
                'Ticket',
                'Abo-Nr.',
                ...(showBank ? ['Kontoinhaber', 'IBAN', 'Bank', 'BIC'] : []),
                'E-Mail',
                'Bemerkungen',
                'Stand',
                'Berechnungsrelevant',
              ].map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-line bg-muted/60 px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.tnId} className="border-b border-line/60 align-top hover:bg-muted/40">
                <td className="whitespace-nowrap px-3 py-2 font-semibold">
                  <CourseChip id={m.tnId} />
                </td>
                {/* Nur der Name — die ID steht bereits in der Spalte davor. */}
                <td className="whitespace-nowrap px-3 py-2">
                  <Link to={`/admin/tn/${m.tnId}`} className="hover:underline">
                    <TnName id={m.tnId} name={fullName(m)} chip={false} />
                  </Link>
                </td>
                <td className="min-w-[12rem] px-3 py-2">{address(m) || '—'}</td>
                <td className="min-w-[10rem] px-3 py-2">{m.fahrtroute || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {m.entfernungKm != null ? String(m.entfernungKm).replace('.', ',') : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{m.vmtZone || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {m.verkehrsmittel || '—'}
                  {m.kennzeichen && <span className="ml-1 text-xs text-ink-dim">({m.kennzeichen})</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {m.ticket || '—'}
                  {m.ticketart && <span className="ml-1 text-xs text-ink-dim">· {m.ticketart}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{m.aboNummer || '—'}</td>
                {showBank && (
                  <>
                    <td className="whitespace-nowrap px-3 py-2">{m.kontoinhaber || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{m.iban || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2">{m.bank || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{m.bic || '—'}</td>
                  </>
                )}
                <td className="whitespace-nowrap px-3 py-2 text-xs">{m.email || '—'}</td>
                <td className="min-w-[12rem] px-3 py-2 text-xs text-ink-dim">{m.bemerkungen || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-dim">{m.lastUpdate || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <StatusTag kind={m.berechnung === 'Berechnungsrelevant' ? 'approved' : 'blocked'}>
                    {m.berechnung === 'Berechnungsrelevant' ? 'Berechnungsrelevant' : 'Nicht relevant'}
                  </StatusTag>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showBank ? 17 : 13} className="px-3 py-6 text-center text-ink-dim">
                  Keine Treffer für „{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-ink-dim">
        Quelle: Hauptdatei, Tab „Alle_TN_Daten". Bankdaten sind nur für Admins
        sichtbar (NFR-01) — Dozent:innen sehen alle übrigen Stammdaten, TN
        ausschließlich ihre eigenen Daten.
      </p>
    </div>
  );
}
