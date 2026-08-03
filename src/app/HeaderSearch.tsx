/** Kopfzeilen-Suche: findet TN nach Name oder ID im aktiven Monat. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from './session';
import { STAFF_ROLES } from '../adapters/types';
import type { MonthRecord } from '../domain/types';

export default function HeaderSearch() {
  const { user, storage, storageVersion, month: MONTH } = useSession();
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<MonthRecord[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  const isStaff = STAFF_ROLES.includes(user.role);
  const monthStr = MONTH;

  useEffect(() => {
    if (!isStaff) return;
    storage.listMonthRecords(user, monthStr).then(setRecords).catch(() => setRecords([]));
  }, [user, storage, storageVersion, monthStr, isStaff]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return records
      .filter(
        (r) =>
          r.participantName.toLowerCase().includes(q) ||
          r.participantId.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, records]);

  if (!isStaff) return null;

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Suche: Name oder TN-ID…"
        aria-label="Teilnehmer:innen suchen"
        className="w-full rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none focus:border-primary"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-line bg-surface shadow-lg">
          {results.map((r) => (
            <li key={r.participantId}>
              <button
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  setQuery('');
                  navigate(`/admin/tn/${r.participantId}`);
                }}
              >
                <span className="text-xs text-ink-dim">{r.participantId}</span>
                <span>{r.participantName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 2 && results.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink-dim shadow-lg">
          Keine Treffer im aktiven Monat.
        </p>
      )}
    </div>
  );
}
