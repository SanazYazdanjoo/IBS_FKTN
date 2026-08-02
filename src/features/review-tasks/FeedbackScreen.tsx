/** End-of-session questionnaire, reached after the last guided task (review build only). */
import { useState } from 'react';
import { Card, Eyebrow, PrimaryButton } from '../../app/ui';
import { useSession } from '../../app/session';
import { APP_VERSION, GIT_SHA } from '../../app/reviewBuild';
import { addSessionFeedback } from '../feedback/feedbackStore';

const QUESTIONS = [
  'Was hat am meisten gefehlt?',
  'Was hat gut funktioniert?',
  'Würden Sie das im Alltag anstelle der aktuellen Lösung (Excel) nutzen — warum oder warum nicht?',
  'Sonstige Anmerkungen (optional)',
];

export default function FeedbackScreen() {
  const { user } = useSession();
  const [answers, setAnswers] = useState<string[]>(QUESTIONS.map(() => ''));
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    addSessionFeedback({
      id: `sfb-${Date.now()}`,
      createdAt: new Date().toISOString(),
      role: user.role,
      appVersion: APP_VERSION,
      gitSha: GIT_SHA,
      answers: QUESTIONS.map((q, i) => ({ question: q, answer: answers[i].trim() })),
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <Eyebrow>Feedback</Eyebrow>
        <Card>
          <p className="font-semibold">Danke — Ihre Antworten wurden gespeichert.</p>
          <p className="mt-2 text-sm text-ink-dim">
            Sie können diesen Tab jetzt schließen. Bei Bedarf ist über den Feedback-Knopf unten
            rechts weiterhin eine kurze Rückmeldung zu einzelnen Bildschirmen möglich.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Feedback</Eyebrow>
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">
          Alle Aufgaben abgeschlossen — noch vier kurze Fragen
        </h1>
      </div>
      <Card>
        <div className="space-y-4">
          {QUESTIONS.map((q, i) => (
            <label key={q} className="block">
              <span className="text-sm font-semibold">
                {q}
                {i === 0 && <span className="text-danger"> *</span>}
              </span>
              <textarea
                value={answers[i]}
                onChange={(e) =>
                  setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))
                }
                rows={2}
                className="mt-1 block w-full rounded-lg border border-line p-2 text-sm"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-danger">
          Bitte keine Namen von Teilnehmenden eintragen — Freitext wird nicht automatisch geprüft.
        </p>
        <PrimaryButton
          className="mt-4"
          onClick={submit}
          disabled={answers[0].trim().length === 0}
        >
          Absenden
        </PrimaryButton>
      </Card>
    </div>
  );
}
