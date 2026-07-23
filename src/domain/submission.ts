/**
 * Einreichungsregeln: erforderliche Nachweise je Ticketart (§II/§VI).
 * Die Upload-Checkliste (FR-02) wird direkt aus requiredProofs() gerendert.
 */
import { z } from 'zod';
import type { ProofKind, SubmittedDocument, TicketType } from './types';

export interface SubmissionContext {
  ticketType: TicketType;
  hasPraktikum: boolean;
  /** Praktikumsvertrag wird einmalig zu Beginn eingereicht. */
  praktikumContractAlreadyOnFile: boolean;
  /** Foto der Abo-Karte wird einmalig eingereicht. */
  aboCardAlreadyOnFile: boolean;
}

/** The checklist: exactly which proofs this TN owes for this month. */
export function requiredProofs(ctx: SubmissionContext): ProofKind[] {
  const proofs: ProofKind[] = [];
  switch (ctx.ticketType) {
    case 'ABO':
      if (!ctx.aboCardAlreadyOnFile) proofs.push('TICKET_PHOTO');
      proofs.push('PAYMENT_PROOF');
      // Für Abo-Karten ist keine Rechnung erforderlich.
      break;
    case 'ONLINE':
      proofs.push('TICKET_PHOTO', 'PAYMENT_PROOF', 'INVOICE');
      break;
    case 'PKW':
      proofs.push('LICENSE_PLATE', 'GENERAL_INFO');
      break;
  }
  if (ctx.hasPraktikum && !ctx.praktikumContractAlreadyOnFile) {
    proofs.push('PRAKTIKUM_CONTRACT');
  }
  return proofs;
}

export const documentSchema = z.object({
  kind: z.enum([
    'TICKET_PHOTO',
    'PAYMENT_PROOF',
    'INVOICE',
    'LICENSE_PLATE',
    'GENERAL_INFO',
    'PRAKTIKUM_CONTRACT',
    'DISTANCE_PROOF',
  ]),
  fileName: z.string().min(1),
  state: z.enum(['MISSING', 'UPLOADED', 'ILLEGIBLE', 'VERIFIED']),
  correctionReason: z.string().optional(),
  uploadedAt: z.string().optional(),
});

export interface CompletenessResult {
  complete: boolean;
  missing: ProofKind[];
  needsCorrection: ProofKind[];
}

/** Drives "Absenden — vollständig ✓" vs "2/3 vollständig" (P6). */
export function checkCompleteness(
  ctx: SubmissionContext,
  documents: SubmittedDocument[],
): CompletenessResult {
  const required = requiredProofs(ctx);
  const missing: ProofKind[] = [];
  const needsCorrection: ProofKind[] = [];
  for (const kind of required) {
    const doc = documents.find((d) => d.kind === kind);
    if (!doc || doc.state === 'MISSING') missing.push(kind);
    else if (doc.state === 'ILLEGIBLE') needsCorrection.push(kind);
  }
  return {
    complete: missing.length === 0 && needsCorrection.length === 0,
    missing,
    needsCorrection,
  };
}
