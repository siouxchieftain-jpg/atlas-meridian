import type { CaseId, ConfLevel, CoreCaseId, Outcome, ReasonId, Role, SectionId, TagId } from '../content/types';

/** A message the person at the screen wrote (never pre-filled). */
export interface WrittenMessage {
  id: string;
  from: Role;
  date: string;
  text: string;
  kind: 'reply' | 'question' | 'answer';
}

/** The GP's own work on one case. Every judgement starts empty. */
export interface GpWork {
  placement?: number;
  /** The first placement, before the system's reading was shown (the debrief says if the marker moved after it). */
  placementFirst?: number;
  tags: TagId[];
  description: string;
  confidence?: ConfLevel;
  decision?: 'behold' | 'henvis';
  decisionReason: string;
  decisionSaved?: boolean;
  /** The referral draft, created from the record when the draft is first opened. */
  draft?: Partial<Record<SectionId, string>>;
  /** «Send henvisning» or «Lagre utkast». */
  referral?: 'sent' | 'draft';
  referralDate?: string;
  messages: WrittenMessage[];
  /** Kari: chose not to reply to DPS's request. Astrid: chose not to ask. */
  skippedMessage?: boolean;
  plan?: 'folgOpp' | 'henvisPaNytt';
  planReason: string;
  planSaved?: boolean;
  secondDraft?: Partial<Record<SectionId, string>>;
  secondReferral?: 'sent' | 'draft';
  /** The new referral's date: never before the last message in the thread (r5F-05). */
  secondReferralDate?: string;
}

/** The DPS clinician's own work on one case. Every judgement starts empty. */
export interface DpsWork {
  placement?: number;
  /** The first placement, before the GP's marker and the system's reading were shown. */
  placementFirst?: number;
  outcome?: Outcome;
  reasons: ReasonId[];
  explanation: string;
  advice: string;
  question: string;
  sent?: boolean;
  sentDate?: string;
  /** After «Be om mer informasjon» and the GP's reply: one final choice. */
  finalOutcome?: 'rett' | 'retur';
  finalReasons: ReasonId[];
  finalExplanation: string;
  finalAdvice: string;
  finalSent?: boolean;
  finalDate?: string;
  /** Astrid: the answer to the GP's question. */
  answer: string;
  answerSent?: boolean;
  answerSkipped?: boolean;
}

export const emptyGp = (): GpWork => ({
  tags: [],
  description: '',
  decisionReason: '',
  messages: [],
  planReason: '',
});

export const emptyDps = (): DpsWork => ({
  reasons: [],
  explanation: '',
  advice: '',
  question: '',
  finalReasons: [],
  finalExplanation: '',
  finalAdvice: '',
  answer: '',
});

/** Review: the DPS side has begun work on a case (a placement, a choice, words, or a sent assessment). */
export const dpsHasWork = (d: DpsWork): boolean =>
  d.placement !== undefined ||
  d.outcome !== undefined ||
  d.sent === true ||
  d.reasons.length > 0 ||
  d.explanation.trim() !== '' ||
  d.advice.trim() !== '' ||
  d.question.trim() !== '' ||
  d.finalSent === true;

/** Every DPS field back to empty: an update merges, so the optional fields are named one by one (r8F-01). */
export const clearedDps = (): DpsWork => ({
  ...emptyDps(),
  placement: undefined,
  placementFirst: undefined,
  outcome: undefined,
  sent: undefined,
  sentDate: undefined,
  finalOutcome: undefined,
  finalSent: undefined,
  finalDate: undefined,
  answerSent: undefined,
  answerSkipped: undefined,
});

/**
 * Where a participant is in one case, in study mode.
 * briefing → uten (case only, page 1) → atlas (own work) → page2 (the rest of
 * the form; the other side's reply is held) → reply → debrief → done.
 */
export type CasePhase = 'briefing' | 'uten' | 'atlas' | 'page2' | 'reply' | 'debrief' | 'done';

export type StepId =
  | 'velkommen'
  | 'om-deg'
  | 'omvisning'
  | 'helhet'
  | 'kari'
  | 'erlend'
  | 'astrid'
  | 'avslutning'
  | 'ekstra'
  | 'takk';

/**
 * v3.1: the participant comes home to the overview after «Om deg», starts the tour from there, works the three cases
 * from there, and answers «ATLAS som helhet» (S2) after the cases, when there is something to judge.
 */
export const STEP_ORDER: StepId[] = [
  'velkommen',
  'om-deg',
  'omvisning',
  'kari',
  'erlend',
  'astrid',
  'helhet',
  'avslutning',
  'ekstra',
  'takk',
];

/** The study's form steps (`steg` values without the `-etter` suffix), and S9, the feedback form, which is no step. */
export type FormStep = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9';

/** The natural breaks where ATLAS asks once for feedback: the end of the tour and the end of each case. */
export type PromptKey = 'tour' | CoreCaseId;

export const CASE_FORM: Record<CoreCaseId, FormStep> = { kari: 'S3', erlend: 'S4', astrid: 'S5' };
export const CASE_VIGNETT: Record<CaseId, string> = { kari: 'V1', erlend: 'V3', astrid: 'V4', torbjorn: 'V2', sofie: 'P' };

export interface LedgerEntry {
  status: 'sent' | 'skipped';
  at: string;
  steg: string;
  via: 'panel' | 'tab' | 'confirm' | 'preview' | 'skip';
}

export type RoleChoice = 'fastlege' | 'dps-kliniker' | 'annen';
export type Intervju = 'Ja' | 'Nei' | 'Vil ikke svare';

export interface StudyState {
  v: 2;
  roleChoice?: RoleChoice;
  intervju?: Intervju;
  /** The random study name («Rolig elg 27»), made when the role is chosen; a locked field in every study form. */
  studienavn?: string;
  /** The furthest step reached. Steps before it count as completed. */
  furthest: StepId;
  /** Decided by S1: forms open in the panel, or in a new tab from the start. */
  route?: 'panel' | 'tab';
  ledger: Partial<Record<FormStep, LedgerEntry>>;
  /** Cases where «Vis ATLAS» was pressed. Survives every reset. */
  visAtlas: Partial<Record<CoreCaseId, boolean>>;
  /** «Jeg har svart på side 1», per case. */
  page1: Partial<Record<CoreCaseId, boolean>>;
  phase: Partial<Record<CaseId, CasePhase>>;
  gp: Partial<Record<CaseId, GpWork>>;
  dps: Partial<Record<CaseId, DpsWork>>;
  /** `started`: past the card before the tour («Start omvisningen»). */
  tour: { part: number; step: number; done: boolean; started?: boolean };
  extra: { v5Seen?: boolean; finished?: boolean };
  /** What the participant did with each natural-break prompt: it is asked once («sent» or «later»). */
  prompts: Partial<Record<PromptKey, 'sent' | 'later'>>;
  /** S9 sent from this browser: the parts, as `side#seksjon`, for «Sendt» marks in the feedback list. */
  feedbackSent: string[];
  /** A form opened in a new tab and not yet confirmed. */
  pendingTab?: { form: FormStep; steg: string; at: string };
  /** Progress made with the preview flag (a reviewer's trial run, never a participant's). */
  previewRun?: boolean;
}

export type ReviewerRole = 'Fastlege' | 'DPS-kliniker' | 'Veileder' | 'Ekstern fagperson';

export interface ReviewState {
  v: 1;
  reviewer?: ReviewerRole;
  view: Role;
  notes: boolean;
  gp: Partial<Record<CaseId, GpWork>>;
  dps: Partial<Record<CaseId, DpsWork>>;
  /** Case views shown in their «Uten ATLAS» state, keyed `${role}:${case}`. */
  withoutAtlas: Record<string, boolean>;
  feedbackSent: string[];
  wrapUpSent?: boolean;
  noData: { pattern: boolean; kalibrering: boolean };
}
