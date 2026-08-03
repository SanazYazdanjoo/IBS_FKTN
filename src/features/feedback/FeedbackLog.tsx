/** Review screen: lists every captured feedback entry and end-of-session questionnaire, exportable. */
import { useState } from 'react';
import { Card, PrimaryButton, SecondaryButton } from '../../app/ui';
import {
  exportFeedbackJson,
  exportFeedbackMarkdown,
  loadFeedbackEntries,
  loadSessionFeedback,
  SEVERITY_LABELS,
} from './feedbackStore';

export default function FeedbackLog() {
  const [entries] = useState(loadFeedbackEntries);
  const [sessions] = useState(loadSessionFeedback);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">
          {entries.length} Rückmeldung(en) · {sessions.length} Abschluss-Fragebogen
        </h1>
      </div>

      <Card>
        <p className="text-sm text-ink-dim">
          Nur lokal gespeichert, nie übertragen. Freitext wurde nicht automatisch geprüft und kann
          personenbezogene Angaben enthalten — vor jeder Weitergabe manuell durchsehen.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PrimaryButton onClick={exportFeedbackJson}>Als JSON exportieren</PrimaryButton>
          <SecondaryButton onClick={exportFeedbackMarkdown}>Als Markdown exportieren</SecondaryButton>
        </div>
      </Card>

      {entries.map((e) => (
        <Card key={e.id}>
          <p className="text-xs font-semibold uppercase tracking-label text-ink-dim">
            {SEVERITY_LABELS[e.severity]} · {e.screen}
            {e.target ? ` · ${e.target}` : ''}
          </p>
          <p className="mt-1 text-xs text-ink-dim">
            {new Date(e.createdAt).toLocaleString('de-DE')} · {e.role}
            {e.taskId ? ` · Aufgabe ${e.taskId}` : ''} · v{e.appVersion} · {e.gitSha}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{e.text}</p>
        </Card>
      ))}

      {sessions.map((s) => (
        <Card key={s.id} className="border-primary">
          <p className="text-xs font-semibold uppercase tracking-label text-ink-dim">
            Abschluss-Fragebogen · {s.role}
          </p>
          <p className="mt-1 text-xs text-ink-dim">
            {new Date(s.createdAt).toLocaleString('de-DE')} · v{s.appVersion} · {s.gitSha}
          </p>
          <dl className="mt-2 space-y-2">
            {s.answers.map((a, i) => (
              <div key={i}>
                <dt className="text-sm font-semibold">{a.question}</dt>
                <dd className="whitespace-pre-wrap text-sm text-ink-dim">
                  {a.answer || '(keine Antwort)'}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}

      {entries.length === 0 && sessions.length === 0 && (
        <Card>
          <p className="text-sm text-ink-dim">Noch keine Rückmeldungen erfasst.</p>
        </Card>
      )}
    </div>
  );
}
