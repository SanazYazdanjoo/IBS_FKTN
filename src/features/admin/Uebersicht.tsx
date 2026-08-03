/**
 * Übersicht — Zusammenführung von Dashboard und Pipeline.
 *
 * Beide zeigten denselben Ausschnitt: den Monat (oder „alle Monate") aus der
 * Kontextbox. Sie unterschieden sich nur in der Darstellung — Tabelle mit
 * Zahlen und Sammelfreigabe gegenüber Spalten nach Prozessschritt. Als zwei
 * Seiten zwang das zum Wechseln und Wiederfinden desselben Monats; als eine
 * Seite mit Darstellungswahl bleibt der Ausschnitt beim Umschalten stehen.
 *
 * Aufbau folgt der Anwesenheitsliste: Kontext oben, Darstellungswahl
 * daneben, Inhalt darunter.
 */
import { useState } from 'react';
import MonthContextBox from '../../app/MonthContextBox';
import AdminDashboard from './Dashboard';
import AdminPipeline from './Pipeline';

type Layout = 'tabelle' | 'pipeline';

const LAYOUTS: readonly (readonly [Layout, string, string])[] = [
  ['tabelle', 'Tabelle', 'Zahlen, Filter und Sammelfreigabe'],
  ['pipeline', 'Pipeline', 'Karten nach Prozessschritt'],
] as const;

export default function Uebersicht({
  initialLayout = 'tabelle',
}: {
  initialLayout?: Layout;
}) {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">Übersicht</h1>
      </div>

      {/* Der Ausschnitt gilt fuer beide Darstellungen und steht deshalb
          einmal oben — nicht je Darstellung erneut. */}
      <MonthContextBox />

      <div role="radiogroup" aria-label="Darstellung" className="flex flex-wrap gap-1">
        {LAYOUTS.map(([key, label, hint]) => (
          <button
            key={key}
            role="radio"
            aria-checked={layout === key}
            onClick={() => setLayout(key)}
            title={hint}
            className={`rounded-full px-3 py-1 text-sm ${
              layout === key
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-dim)] hover:bg-[var(--muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {layout === 'tabelle' ? <AdminDashboard embedded /> : <AdminPipeline embedded />}
    </div>
  );
}
