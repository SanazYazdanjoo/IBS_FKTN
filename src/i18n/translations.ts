/**
 * Typed key→string translations for the TN flow (FR-15, P6/P1). Deliberately
 * scoped to `src/features/tn/` for this pass — not a whole-app extraction.
 * A plain object map instead of i18next: this app ships as a single offline
 * HTML file in the review build (`VITE_REVIEW_BUILD=1`,
 * `src/domain/__tests__/review-build-no-external-urls.test.ts`), and the
 * whole TN vocabulary here is a few dozen short strings — i18next's ICU
 * message parser, plugin system and namespace loader would add real bundle
 * weight to solve a problem two flat objects already solve.
 */
import type { ProofKind, TicketType } from '../domain/types';

export type Locale = 'de' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['de', 'en'];

export const LOCALE_LABELS: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
};

export interface TnFlowStrings {
  common: {
    loading: string;
    back: string;
    roleGate: string;
  };
  home: {
    eyebrow: (monthLabel: string) => string;
    daysLeft: (days: number) => string;
    amountHeadline: (amountEur: string) => string;
    traceSummary: string;
    /** One-line plain-language gloss for the VMT comparison — shown whenever result.trace.vmt is present. */
    traceVmtGloss: (amountEur: string) => string;
    unexcusedDeduction: (days: number) => string;
    notSubmittedYet: (monthLabel: string) => string;
  };
  tasks: {
    eyebrow: string;
    uploadTask: string;
    uploadTaskHint: string;
    startUpload: string;
    waitingForPayout: string;
  };
  signature: {
    paperTitle: string;
    paperHint: string;
    paperAction: string;
    paperDigitalNote: string;
    digitalTitle: string;
    digitalHint: string;
    digitalAction: string;
  };
  ticketType: {
    eyebrow: string;
    heading: string;
    options: Record<TicketType, { label: string; hint: string }>;
    rememberedHint: string;
  };
  upload: {
    eyebrow: string;
    proofLabels: Record<ProofKind, string>;
    /** One-line plain gloss per proof — used by Schritt-für-Schritt (P1) so nothing stays unexplained jargon. */
    proofGlosses: Record<ProofKind, string>;
    choosePhoto: string;
    privacyHint: string;
    submitComplete: string;
    submitPartial: (done: number, total: number) => string;
  };
  photoCapture: {
    takePhoto: string;
    retake: string;
    chosenFile: string;
  };
  modeSwitch: {
    label: string;
    standard: string;
    stepByStep: string;
  };
  stepMode: {
    welcomeHeading: string;
    welcomeBody: string;
    startAction: string;
    stepCounter: (current: number, total: number) => string;
    ticketQuestion: string;
    next: string;
    back: string;
    proofScreenHint: string;
    reviewHeading: string;
    reviewBody: string;
    submitAction: string;
    doneHeading: string;
    doneBody: string;
  };
}

const de: TnFlowStrings = {
  common: {
    loading: 'Lädt…',
    back: '← Zurück',
    roleGate: 'Diese Ansicht ist für TN-Nutzer:innen. Bitte oben eine TN-Rolle wählen.',
  },
  home: {
    eyebrow: (monthLabel) => `${monthLabel} 2026 · Home`,
    daysLeft: (days) => `Noch ${days} Tage bis zum 15.!`,
    amountHeadline: (amountEur) => `${amountEur} unterwegs zu dir`,
    traceSummary: 'So wurde gerechnet',
    traceVmtGloss: (amountEur) =>
      `Wir haben zwei Rechenwege verglichen und dir den günstigeren gewählt: ${amountEur}.`,
    unexcusedDeduction: (days) =>
      `Abzug: ${days} unentschuldigter Tag${days > 1 ? 'e' : ''}`,
    notSubmittedYet: (monthLabel) => `Dein ${monthLabel}: noch nichts eingereicht`,
  },
  tasks: {
    eyebrow: 'Aufgaben',
    uploadTask: 'Nachweise hochladen',
    uploadTaskHint: '· ca. 2 Minuten',
    startUpload: "Los geht's →",
    waitingForPayout: 'Warten auf Auszahlung… du bekommst eine Nachricht.',
  },
  signature: {
    paperTitle: 'Formular unterschreiben',
    paperHint: 'im Institut oder per Post (Modus A · FR-09/P7)',
    paperAction: "So geht's →",
    paperDigitalNote: 'Bei Modus B (digitale Bestätigung): 30 Sekunden in der App.',
    digitalTitle: 'Digital bestätigen',
    digitalHint: '30 Sekunden — kein Weg ins Institut (P7)',
    digitalAction: 'Jetzt bestätigen',
  },
  ticketType: {
    eyebrow: 'Schritt 1/2 · Ticketart',
    heading: 'Womit fährst du?',
    options: {
      ABO: { label: 'Deutschlandticket (Abo)', hint: 'Ticket-Screenshot + Kontoauszug' },
      ONLINE: { label: 'Online-Einzelticket', hint: 'Rechnung/Beleg' },
      PKW: { label: 'PKW', hint: 'km-Angabe, ≥ 3 km' },
    },
    rememberedHint: 'Auswahl wird gemerkt — nächsten Monat vorausgefüllt',
  },
  upload: {
    eyebrow: 'Schritt 2/2 · Nachweise',
    proofLabels: {
      TICKET_PHOTO: 'Ticket-Foto / Screenshot',
      PAYMENT_PROOF: 'Kontoauszug (geschwärzt)',
      INVOICE: 'Rechnung',
      LICENSE_PLATE: 'Kennzeichen-Nummer',
      GENERAL_INFO: 'Allgemeine Info (Name, Zeitraum)',
      PRAKTIKUM_CONTRACT: 'Praktikumsvertrag',
      DISTANCE_PROOF: 'Entfernungsnachweis',
    },
    proofGlosses: {
      TICKET_PHOTO: 'Mach ein Foto von deinem Ticket oder Screenshot.',
      PAYMENT_PROOF:
        'Zeig, dass du für das Ticket bezahlt hast. Andere Zeilen darfst du unkenntlich machen.',
      INVOICE: 'Mach ein Foto von der Rechnung für dein Ticket.',
      LICENSE_PLATE: 'Trag die Nummer von deinem Auto-Kennzeichen ein.',
      GENERAL_INFO: 'Trag deinen Namen und den Zeitraum ein, für den du fährst.',
      PRAKTIKUM_CONTRACT: 'Mach ein Foto von deinem Praktikumsvertrag.',
      DISTANCE_PROOF: 'Zeig einen Nachweis für die Entfernung zur Arbeit.',
    },
    choosePhoto: 'Datei wählen',
    privacyHint: 'Wird sicher in der IBS-Cloud gespeichert — kein Versand per E-Mail nötig. (NFR-01)',
    submitComplete: 'Absenden — vollständig ✓',
    submitPartial: (done, total) => `Absenden — ${done}/${total} vollständig`,
  },
  photoCapture: {
    takePhoto: '📷 Foto aufnehmen',
    retake: '📷 Neues Foto aufnehmen',
    chosenFile: 'Ausgewählt:',
  },
  modeSwitch: {
    label: 'Ansicht',
    standard: 'Standard',
    stepByStep: 'Schritt für Schritt',
  },
  stepMode: {
    welcomeHeading: 'Hallo!',
    welcomeBody: 'Wir gehen das zusammen durch. Ein Schritt nach dem anderen.',
    startAction: 'Los geht\'s',
    stepCounter: (current, total) => `Schritt ${current} von ${total}`,
    ticketQuestion: 'Wie fährst du zur Arbeit?',
    next: 'Weiter →',
    back: '← Zurück',
    proofScreenHint: 'Tipp: Ein Foto mit dem Handy reicht.',
    reviewHeading: 'Alles bereit?',
    reviewBody: 'Prüf kurz, ob alles dabei ist. Dann kannst du absenden.',
    submitAction: 'Absenden',
    doneHeading: 'Geschafft!',
    doneBody: 'Danke! Wir melden uns, wenn wir alles geprüft haben.',
  },
};

const en: TnFlowStrings = {
  common: {
    loading: 'Loading…',
    back: '← Back',
    roleGate: 'This screen is for TN accounts. Please pick a TN role above.',
  },
  home: {
    eyebrow: (monthLabel) => `${monthLabel} 2026 · Home`,
    daysLeft: (days) => `${days} days left until the 15th!`,
    amountHeadline: (amountEur) => `${amountEur} is on its way to you`,
    traceSummary: 'How this was calculated',
    traceVmtGloss: (amountEur) =>
      `We compared two ways to calculate this and picked the cheaper one for you: ${amountEur}.`,
    unexcusedDeduction: (days) =>
      `Deducted: ${days} unexcused day${days > 1 ? 's' : ''}`,
    notSubmittedYet: (monthLabel) => `Your ${monthLabel}: nothing submitted yet`,
  },
  tasks: {
    eyebrow: 'Tasks',
    uploadTask: 'Upload proofs',
    uploadTaskHint: '· about 2 minutes',
    startUpload: "Let's go →",
    waitingForPayout: 'Waiting for payout… we will message you.',
  },
  signature: {
    paperTitle: 'Sign the form',
    paperHint: 'at the institute or by post (Mode A · FR-09/P7)',
    paperAction: "How to →",
    paperDigitalNote: 'In Mode B (digital confirmation): 30 seconds in the app.',
    digitalTitle: 'Confirm digitally',
    digitalHint: '30 seconds — no trip to the institute (P7)',
    digitalAction: 'Confirm now',
  },
  ticketType: {
    eyebrow: 'Step 1/2 · Ticket type',
    heading: 'How do you get there?',
    options: {
      ABO: { label: 'Deutschlandticket (subscription)', hint: 'Ticket screenshot + bank statement' },
      ONLINE: { label: 'Single online ticket', hint: 'Invoice/receipt' },
      PKW: { label: 'Car', hint: 'distance in km, ≥ 3 km' },
    },
    rememberedHint: 'Your choice is remembered — pre-filled next month',
  },
  upload: {
    eyebrow: 'Step 2/2 · Proofs',
    proofLabels: {
      TICKET_PHOTO: 'Ticket photo / screenshot',
      PAYMENT_PROOF: 'Bank statement (redacted)',
      INVOICE: 'Invoice',
      LICENSE_PLATE: 'License plate number',
      GENERAL_INFO: 'General info (name, period)',
      PRAKTIKUM_CONTRACT: 'Internship contract',
      DISTANCE_PROOF: 'Proof of distance',
    },
    proofGlosses: {
      TICKET_PHOTO: 'Take a photo of your ticket or screenshot.',
      PAYMENT_PROOF: 'Show that you paid for the ticket. You may blank out other lines.',
      INVOICE: 'Take a photo of the invoice for your ticket.',
      LICENSE_PLATE: 'Enter your car\'s license plate number.',
      GENERAL_INFO: 'Enter your name and the period you are traveling for.',
      PRAKTIKUM_CONTRACT: 'Take a photo of your internship contract.',
      DISTANCE_PROOF: 'Show a proof of the distance to work.',
    },
    choosePhoto: 'Choose file',
    privacyHint: 'Stored securely in the IBS cloud — no need to send by email. (NFR-01)',
    submitComplete: 'Submit — complete ✓',
    submitPartial: (done, total) => `Submit — ${done}/${total} complete`,
  },
  photoCapture: {
    takePhoto: '📷 Take a photo',
    retake: '📷 Take a new photo',
    chosenFile: 'Selected:',
  },
  modeSwitch: {
    label: 'View',
    standard: 'Standard',
    stepByStep: 'Step by step',
  },
  stepMode: {
    welcomeHeading: 'Hello!',
    welcomeBody: 'We\'ll go through this together. One step at a time.',
    startAction: "Let's go",
    stepCounter: (current, total) => `Step ${current} of ${total}`,
    ticketQuestion: 'How do you get to work?',
    next: 'Next →',
    back: '← Back',
    proofScreenHint: 'Tip: A photo from your phone is enough.',
    reviewHeading: 'All set?',
    reviewBody: 'Check that everything is there. Then you can submit.',
    submitAction: 'Submit',
    doneHeading: 'Done!',
    doneBody: 'Thank you! We will let you know once we have checked everything.',
  },
};

export const TRANSLATIONS: Record<Locale, TnFlowStrings> = { de, en };
