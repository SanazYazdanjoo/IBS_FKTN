/**
 * Fehlergrenze — verhindert, dass ein Laufzeitfehler in einer Ansicht die
 * gesamte App leerräumt. Zeigt stattdessen eine unaufgeregte Meldung mit
 * Aktionen ("Neu laden" / "Zur Startseite") und protokolliert den Fehler
 * in die Konsole, damit er beim Testen sofort sichtbar ist.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Für die Entwickler:innen: vollständiger Stacktrace in der Konsole.
    console.error('UI-Fehler in einer Ansicht:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm">
        <h2 className="text-lg font-bold text-red-700">Etwas ist schiefgelaufen.</h2>
        <p className="text-red-800">
          Diese Ansicht konnte nicht dargestellt werden. Der Fehler wurde in der
          Konsole protokolliert.
        </p>
        <details className="text-xs text-red-900">
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
            className="rounded-full bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
          >
            Erneut versuchen
          </button>
          <a
            href="/"
            className="rounded-full border border-red-300 bg-white px-4 py-2 font-semibold text-red-800 hover:border-red-500"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }
}
