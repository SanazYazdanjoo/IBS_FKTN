/**
 * Platzhalterseiten für Funktionen, die noch nicht gebaut sind, sowie die
 * Dokumentationsseite.
 *
 * Bewusst als eigene Menüpunkte sichtbar und nicht versteckt: der geplante
 * Umfang bleibt so für alle Beteiligten erkennbar. Damit niemand sie für
 * fertig hält, sind die Einträge in der Navigation gedämpft dargestellt.
 */
import { useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import { Card, Eyebrow, SecondaryButton } from '../../app/ui';

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>In Arbeit</Eyebrow>
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">{title}</h1>
      </div>
      <Card>
        <p className="text-sm text-ink-dim">to be implemented</p>
      </Card>
    </div>
  );
}

export function AutoReminderEmails() {
  return <Placeholder title="Auto-Reminder Emails" />;
}

/** Ablageort der Grafik; die Datei wird separat hinterlegt. */
const DOC_SVG = `${import.meta.env.BASE_URL}assets/documentation.svg`;

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 1.4;

type Pan = { x: number; y: number };

export function Documentation() {
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(MIN_SCALE);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; pan: Pan } | null>(null);

  // Verschieben darf das Bild nie ganz aus dem sichtbaren Bereich treiben —
  // sonst verliert man beim Zoomen leicht die Orientierung.
  function clampPan(next: Pan, atScale: number): Pan {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return next;
    const maxX = ((atScale - 1) * rect.width) / 2;
    const maxY = ((atScale - 1) * rect.height) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function zoomBy(factor: number) {
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
      setPan((p) => (next === MIN_SCALE ? { x: 0, y: 0 } : clampPan(p, next)));
      return next;
    });
  }

  function resetZoom() {
    setScale(MIN_SCALE);
    setPan({ x: 0, y: 0 });
  }

  // Zoomen per Strg/Cmd + Scrollen — üblicher Desktop-Konvention folgend,
  // damit normales Scrollen der Seite nicht versehentlich blockiert wird.
  function handleWheel(e: ReactWheelEvent<HTMLDivElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (scale <= MIN_SCALE) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, pan };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const next = {
      x: drag.pan.x + (e.clientX - drag.startX),
      y: drag.pan.y + (e.clientY - drag.startY),
    };
    setPan(clampPan(next, scale));
  }

  function endDrag() {
    dragRef.current = null;
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomBy(ZOOM_STEP);
    } else if (e.key === '-') {
      e.preventDefault();
      zoomBy(1 / ZOOM_STEP);
    } else if (e.key === '0') {
      e.preventDefault();
      resetZoom();
    }
  }

  const zoomed = scale > MIN_SCALE;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Dokumentation</Eyebrow>
          <h1 className="text-2xl font-semibold text-[var(--text-display)]">
            Prozess &amp; Aufbau
          </h1>
        </div>

        {!failed && (
          <div className="flex items-center gap-2">
            <SecondaryButton
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              disabled={scale <= MIN_SCALE}
              className="px-3 py-1.5"
              logId="docs.zoom-out"
            >
              <span aria-hidden>−</span>
              <span className="sr-only">Verkleinern</span>
            </SecondaryButton>
            <span className="w-12 text-center text-sm tabular-nums text-ink-dim">
              {Math.round(scale * 100)}%
            </span>
            <SecondaryButton
              onClick={() => zoomBy(ZOOM_STEP)}
              disabled={scale >= MAX_SCALE}
              className="px-3 py-1.5"
              logId="docs.zoom-in"
            >
              <span aria-hidden>+</span>
              <span className="sr-only">Vergrößern</span>
            </SecondaryButton>
            <SecondaryButton
              onClick={resetZoom}
              disabled={!zoomed}
              className="px-3 py-1.5 text-xs"
              logId="docs.zoom-reset"
            >
              Zurücksetzen
            </SecondaryButton>
          </div>
        )}
      </div>

      <Card>
        {failed ? (
          // Kein stiller Leerraum: fehlt die Datei, steht hier, welche
          // erwartet wird und wohin sie gehoert.
          <p className="text-sm text-ink-dim">
            Noch keine Grafik hinterlegt. Erwartet wird{' '}
            <code className="rounded bg-muted px-1">public/assets/documentation.svg</code> —
            nach dem Ablegen erscheint sie hier automatisch.
          </p>
        ) : (
          <>
            <div
              ref={viewportRef}
              role="group"
              aria-label="Zoombarer Ausschnitt der Dokumentationsgrafik"
              tabIndex={0}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onDoubleClick={resetZoom}
              onKeyDown={handleKeyDown}
              className="overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              style={{ cursor: zoomed ? (dragRef.current ? 'grabbing' : 'grab') : 'default' }}
            >
              <img
                src={DOC_SVG}
                alt="Dokumentation des Prozesses"
                onError={() => setFailed(true)}
                draggable={false}
                className="h-auto w-full select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: dragRef.current ? 'none' : 'transform 0.1s ease-out',
                }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-dim">
              Zoomen: Buttons oben, oder Strg/Cmd + Scrollen. Bei Zoom lässt sich das Bild
              durch Ziehen verschieben; Doppelklick oder „Zurücksetzen" springt zurück.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
