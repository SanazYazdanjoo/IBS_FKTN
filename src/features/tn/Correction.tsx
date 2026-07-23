/** Korrekturschleife für als unleserlich markierte Nachweise. */
import { useEffect, useState } from 'react';
import { useSession } from '../../app/session';
import { Card, Eyebrow, PrimaryButton } from '../../app/ui';
import type { MonthRecord, ProofKind } from '../../domain/types';

const PROOF_LABELS: Record<ProofKind, string> = {
  TICKET_PHOTO: 'Ticket',
  PAYMENT_PROOF: 'Kontoauszug',
  INVOICE: 'Rechnung',
  LICENSE_PLATE: 'Kennzeichen',
  GENERAL_INFO: 'Allgemeine Info',
  PRAKTIKUM_CONTRACT: 'Praktikumsvertrag',
  DISTANCE_PROOF: 'Entfernungsnachweis',
};

export default function TnCorrection() {
  const { user, storage, month: MONTH } = useSession();
  const [record, setRecord] = useState<MonthRecord | null>(null);

  useEffect(() => {
    if (!user.participantId) return;
    const load = storage.getOrCreateMonthRecord
      ? storage.getOrCreateMonthRecord(user, user.participantId, user.name, MONTH)
      : storage.getMonthRecord(user, user.participantId, MONTH);
    load.then(setRecord).catch(() => setRecord(null));
  }, [user, storage, MONTH]);

  if (!user.participantId) return <Card>Diese Ansicht ist für TN-Nutzer:innen.</Card>;
  if (!record) return <p className="text-ink-dim">Lädt…</p>;

  const flagged = record.documents.filter((d) => d.state === 'ILLEGIBLE');

  if (flagged.length === 0) {
    return (
      <Card>
        <p className="text-ink-dim">
          Aktuell ist keine Korrektur offen. (Zum Testen: in der Admin-Ansicht ein Dokument als
          „unleserlich" markieren.)
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-highlight bg-highlight-weak">
        <Eyebrow>Push · {new Date().toLocaleDateString('de-DE')}</Eyebrow>
        <p className="font-semibold">
          Ein Nachweis muss neu hochgeladen werden — dein Geld ist nicht weg.
        </p>
      </Card>

      {flagged.map((doc) => (
        <Card key={doc.kind}>
          <Eyebrow>Nachreichen · {PROOF_LABELS[doc.kind]}</Eyebrow>
          <p className="mt-1 text-sm">
            <strong>Warum? </strong>
            {doc.correctionReason ?? 'Das Foto ist nicht lesbar.'}
          </p>
          <PrimaryButton
            className="mt-3"
            onClick={async () => {
              const docs = record.documents.map((d) =>
                d.kind === doc.kind
                  ? {
                      ...d,
                      state: 'UPLOADED' as const,
                      fileName: `${doc.kind.toLowerCase()}_korrigiert.jpg`,
                      correctionReason: undefined,
                    }
                  : d,
              );
              const stillFlagged = docs.some((d) => d.state === 'ILLEGIBLE');
              const next: MonthRecord = {
                ...record,
                documents: docs,
                status: stillFlagged ? 'AWAITING_CORRECTION' : 'IN_REVIEW',
              };
              await storage.saveMonthRecord(user, next);
              setRecord(next);
            }}
          >
            Neues Foto aufnehmen / Nachreichen ✓
          </PrimaryButton>
          <p className="mt-2 text-sm font-semibold text-success">
            Dein Anspruch geht NICHT verloren.
          </p>
        </Card>
      ))}
    </div>
  );
}
