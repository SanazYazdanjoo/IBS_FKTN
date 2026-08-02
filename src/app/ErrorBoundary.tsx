/**
 * Fehlergrenze — verhindert, dass ein Laufzeitfehler in einer Ansicht die
 * gesamte App leerräumt. Zeigt stattdessen eine unaufgeregte Meldung mit
 * Aktionen ("Neu laden" / "Zur Startseite") und protokolliert den Fehler
 * in die Konsole, damit er beim Testen sofort sichtbar ist.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportErrorBoundaryTrip } from '../logging/activeLogger.ts';

interface Props {
  children: ReactNode;
  /** Which screen this boundary is wrapping — carried into the event log as a's `comp`, never anything more specific (no stack text, no props). */
  screenName?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Für die Entwickler:innen: vollständiger Stacktrace in der Konsole.
    console.error('UI-Fehler in einer Ansicht:', error, info);
    reportErrorBoundaryTrip(error, this.props.screenName);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl space-y-3 rounded-card border border-problem-ink/30 bg-problem-bg p-6 text-sm">
        <h2 className="text-lg font-bold text-problem-ink">Etwas ist schiefgelaufen.</h2>
        <p className="text-problem-ink">
          Diese Ansicht konnte nicht dargestellt werden. Der Fehler wurde in der
          Konsole protokolliert.
        </p>
        <details className="text-xs text-problem-ink">
          <summary className="cursor-pointer font-semibold">Technische Details</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
            {this.state.error.message}
            {'\n'}
            {this.state.error.stack}
          </pre>
        </details>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={this.reset}
            className="rounded-full bg-danger px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            Erneut versuchen
          </button>
          <a
            href="/"
            className="rounded-full border border-problem-ink/40 bg-white px-4 py-2 font-semibold text-problem-ink hover:border-danger"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }
}
