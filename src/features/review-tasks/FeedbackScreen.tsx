/**
 * Landing point after the last guided task — review build only.
 * Placeholder: structured feedback capture (severity, free text, export) is
 * Part 3. This just confirms the task script is over.
 */
import { Card, Eyebrow } from '../../app/ui';

export default function FeedbackScreen() {
  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Feedback</Eyebrow>
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">
          Danke — alle Aufgaben abgeschlossen
        </h1>
      </div>
      <Card>
        <p className="text-sm text-ink-dim">
          Der strukturierte Feedback-Bildschirm folgt als Nächstes. Bis dahin: vielen Dank fürs
          Durcharbeiten der Aufgaben.
        </p>
      </Card>
    </div>
  );
}
