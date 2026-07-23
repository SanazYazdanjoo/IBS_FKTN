import { describe, expect, it } from 'vitest';
import { checkCompleteness, requiredProofs } from '../submission';
import type { SubmittedDocument } from '../types';

const baseCtx = {
  hasPraktikum: false,
  praktikumContractAlreadyOnFile: false,
  aboCardAlreadyOnFile: false,
};

describe('required proofs per ticket type (TN handout table)', () => {
  it('ABO: card photo (once) + payment proof, explicitly NO invoice', () => {
    const proofs = requiredProofs({ ...baseCtx, ticketType: 'ABO' });
    expect(proofs).toEqual(['TICKET_PHOTO', 'PAYMENT_PROOF']);
    expect(proofs).not.toContain('INVOICE');
  });

  it('ABO with card already on file: only payment proof', () => {
    const proofs = requiredProofs({ ...baseCtx, ticketType: 'ABO', aboCardAlreadyOnFile: true });
    expect(proofs).toEqual(['PAYMENT_PROOF']);
  });

  it('ONLINE: screenshot + payment proof + invoice', () => {
    expect(requiredProofs({ ...baseCtx, ticketType: 'ONLINE' })).toEqual([
      'TICKET_PHOTO',
      'PAYMENT_PROOF',
      'INVOICE',
    ]);
  });

  it('PKW: license plate + general info', () => {
    expect(requiredProofs({ ...baseCtx, ticketType: 'PKW' })).toEqual([
      'LICENSE_PLATE',
      'GENERAL_INFO',
    ]);
  });

  it('Praktikum adds the contract exactly once', () => {
    const first = requiredProofs({ ...baseCtx, ticketType: 'ABO', hasPraktikum: true });
    expect(first).toContain('PRAKTIKUM_CONTRACT');
    const later = requiredProofs({
      ...baseCtx,
      ticketType: 'ABO',
      hasPraktikum: true,
      praktikumContractAlreadyOnFile: true,
    });
    expect(later).not.toContain('PRAKTIKUM_CONTRACT');
  });
});

describe('completeness check (drives "Absenden — vollständig ✓", P6)', () => {
  const docs = (states: Array<SubmittedDocument>): SubmittedDocument[] => states;

  it('complete when all required docs are uploaded/verified', () => {
    const result = checkCompleteness(
      { ...baseCtx, ticketType: 'ABO' },
      docs([
        { kind: 'TICKET_PHOTO', fileName: 'foto_0712.jpg', state: 'UPLOADED' },
        { kind: 'PAYMENT_PROOF', fileName: 'auszug.jpg', state: 'VERIFIED' },
      ]),
    );
    expect(result.complete).toBe(true);
  });

  it('reports the exact missing proof (Maria: Kontoauszug fehlt)', () => {
    const result = checkCompleteness(
      { ...baseCtx, ticketType: 'ABO' },
      docs([{ kind: 'TICKET_PHOTO', fileName: 'foto.jpg', state: 'UPLOADED' }]),
    );
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['PAYMENT_PROOF']);
  });

  it('ILLEGIBLE documents trigger the correction loop, not "missing" (screen 3b)', () => {
    const result = checkCompleteness(
      { ...baseCtx, ticketType: 'ABO' },
      docs([
        { kind: 'TICKET_PHOTO', fileName: 'foto.jpg', state: 'UPLOADED' },
        {
          kind: 'PAYMENT_PROOF',
          fileName: 'auszug.jpg',
          state: 'ILLEGIBLE',
          correctionReason: 'Das Foto ist zu dunkel — der Abbuchungsbetrag ist nicht lesbar.',
        },
      ]),
    );
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual([]);
    expect(result.needsCorrection).toEqual(['PAYMENT_PROOF']);
  });
});
