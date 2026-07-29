/**
 * Kalender als Overlay in der Kopfzeile.
 *
 * Bewusst kein Reiter und keine eigene Seite: das Kalenderblatt enthält
 * keine Teilnehmerdaten, sondern erklärt eine Zahl — die Arbeitstage, die
 * sowohl in der Jahresübersicht als auch als Nenner der Erstattungsformel
 * auftaucht. Diese Frage stellt sich nicht nur in der Anwesenheitsliste,
 * sondern auch in der Pipeline oder auf einem Formular. Deshalb liegt der
 * Zugang in der App-Kopfzeile und nicht in einer einzelnen Seite.
 *
 * Overlay statt Route, weil man kurz nachschlägt und dort weitermacht, wo
 * man war — eine Route würde den Arbeitsstand verlassen.
 */
import { useEffect, useRef } from 'react';
import YearCalendar from '../features/admin/YearCalendar';

interface CalendarOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function CalendarOverlay({ open, onClose }: CalendarOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Hintergrund nicht mitscrollen lassen.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feiertage und Arbeitstage"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-6xl rounded-xl bg-[var(--bg)] p-4 shadow-2xl focus:outline-none sm:p-6"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-display)]">
              Feiertage &amp; Arbeitstage
            </h2>
            <p className="text-xs text-[var(--text-dim)]">
              Nachschlagewerk — erklärt die Arbeitstage hinter den Zahlen der
              Jahresübersicht und der Erstattungsformel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kalender schließen"
            className="rounded-full px-3 py-1 text-sm text-[var(--text-dim)] hover:bg-[var(--muted)]"
          >
            Schließen ✕
          </button>
        </div>

        <YearCalendar embedded onOpenMonth={onClose} />
      </div>
    </div>
  );
}
