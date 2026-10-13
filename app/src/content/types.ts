/**
 * Content model for ATLAS v3. Every participant-facing text is a `T` with
 * Norwegian (bokmål) first and English second. All patients and clinicians
 * are fictional. Dates are ISO strings (YYYY-MM-DD) on the fictional clock:
 * the GP's «today» is Tuesday 2026-03-17 and DPS's «today» is Wednesday
 * 2026-03-18.
 *
 * Copy rules (checked by scripts/check-content.mjs):
 * - no em dash (U+2014) anywhere;
 * - ATLAS's own voice never advises: no «Anbefalt», «Du bør», «Vi anbefaler»,
 *   "Recommended", "You should" (messages written by a clinician role may
 *   advise, but the scripted ones avoid these words too);
 * - clinical content describes, never instructs (third person);
 * - study texts speak for «prosjektet», never «vi»;
 * - briefings, tour texts, ordliste and «Om prototypen» say what an element
 *   shows and where its information comes from, never what it is meant to
 *   achieve. Purposes live only in the `purpose` and `reason` fields, which
 *   study mode shows on the Takk page and review mode shows behind Merknader.
 */

export interface T {
  nb: string;
  en: string;
}

export type Lang = 'nb' | 'en';
export type Role = 'gp' | 'dps';
export type CaseId = 'kari' | 'erlend' | 'astrid' | 'torbjorn' | 'sofie';
export type CoreCaseId = 'kari' | 'erlend' | 'astrid';
export type TagId = 'diagnostisk' | 'terskel' | 'epistemisk';
/** Own confidence in five verbal steps: Lav, Nokså lav, Middels, Nokså høy, Høy. Never a number. */
export type ConfLevel = 'lav' | 'nokssaLav' | 'middels' | 'nokssaHoy' | 'hoy';
/** The five criteria a GP can document. Behandlingsnytte is assessed by DPS and is not counted. */
export type CriterionId = 'alvorlighet' | 'funksjon' | 'varighet' | 'behandling' | 'risiko';
/** The five sections of a referral. */
export type SectionId = 'aktuelt' | 'tidligere' | 'funksjon' | 'risiko' | 'sporsmal';
export type ReasonId = 'situasjonellKrise' | 'kortVarighet' | 'kommunaltIkkeProvd' | 'utilstrekkeligInfo' | 'annen';
export type Outcome = 'info' | 'rett' | 'retur';
/**
 * Where a block of information comes from. Shown as a provenance label on
 * every information block (Analysis check 3).
 */
export type Source =
  | 'record' // the patient record (journal)
  | 'note' // the consultation note
  | 'selfReport' // the patient's self-report before the visit
  | 'own' // the viewer's own input
  | 'gp' // the referring GP (shown to DPS as a role, never a name)
  | 'dps' // the DPS intake team (shown to the GP as a role)
  | 'dpsRecord' // DPS's own record
  | 'system' // the system reading, an illustration written for the vignette
  | 'fictional'; // fictional statistics for the prototype

export interface Chip {
  label: T;
  /** A brand tint marks something new; never a status colour. */
  isNew?: boolean;
}

export interface Row {
  label: T;
  value: T;
}

export interface ProfileRow {
  label: T;
  value: T;
  source: Source;
}

export interface QA {
  q: T;
  a: T;
}

export interface MedRow {
  name: T;
  dose: T;
  period: T;
  status: T;
}

export interface Dated {
  date: string;
  text: T;
}

export interface Briefing {
  /** The clinical task in at most two sentences. Names no ATLAS element. */
  task: T;
  /** GP rows: Hvem, Situasjonen, Hvorfor denne saken, Utgangspunkt (and Merk for Erlend). DPS rows: Hva du får, Hva du ikke får, Frist (Svartid for Astrid). In study mode they describe the case or the letter only. */
  rows: Row[];
  /** For example «Omtrent 10 minutter». */
  time: T;
}

export interface SystemReading {
  /** 0 = clearly outside the DPS criteria, 100 = clearly within. Never shown as a number. */
  placement: number;
  /** One sentence that describes where the reading sits. */
  summary: T;
  /** «Resonnement»: the sources it draws on and what lies near or far from the criteria. */
  reasoning: T;
}

export interface StructuredReturn {
  date: string;
  reasons: ReasonId[];
  explanation: T;
  advice: T;
  /** The criteria not met, each with one line. */
  unmet: { criterion: T; text: T }[];
}

export interface Message {
  date: string;
  text: T;
}

export interface PreviousReferral {
  sent: string;
  decided: string;
  /** For example «Avslått». */
  outcome: T;
  /** The rejection text exactly as it was given. */
  text: T;
  /** An optional line under the letter. Erlend has none: the one-sentence letter speaks for itself, and ATLAS does not comment on it. */
  note?: T;
}

/** A plain letter for a case-only state («Uten ATLAS»). */
export interface Letter {
  date: string;
  from: T;
  title: T;
  /** Paragraphs separated by a blank line. */
  body: T;
}

export interface GpCase {
  timeliste: { time: string; visit: T; chips: Chip[] };
  briefing: Briefing;
  /** One line shown when «Vis ATLAS» is pressed, for example that the case is placed before the reading appears. */
  atlasTask: T;
  profile: ProfileRow[];
  note: { date: string; text: T };
  selfReport: { date: string; intro: T; rows: QA[] };
  meds: { rows: MedRow[]; note: T };
  history: Dated[];
  previousReferral?: PreviousReferral;
  /** Optional: Astrid's views show the structured return instead of a band. */
  systemReading?: SystemReading;
  /** The referral draft as the record would pre-fill it. `fromNote` marks blocks shown with «Hentet fra notatet». «sporsmal» is always empty for the participant. */
  referralDraft?: Record<SectionId, { text: T; fromNote: boolean }>;
  /** Astrid: the plain rejection letter for the case-only state (no reasons, tags or dialogue). Erlend: the previous refusal as a letter. */
  caseOnlyLetter?: Letter;
  /** Astrid: the referral the GP sent on 2026-03-02 (carried into a new draft on «Henvis på nytt»). */
  firstReferral?: { sent: string; sections: Record<SectionId, T> };
  /** The DPS side, scripted for GP participants. */
  dpsScript: {
    placement?: number;
    /** Kari: «Be om mer informasjon», 2026-03-23. */
    request?: Message;
    /** Kari 2026-03-26 (after the GP's reply, or without it); Erlend 2026-03-25 with structured reasons. */
    grant?: Message & { reasons?: T[] };
    /** Astrid: «Retur med råd», 2026-03-16. */
    return?: StructuredReturn;
    /** Astrid: the answer to the GP's question, 2026-03-19. */
    answer?: Message;
  };
}

export interface DpsCase {
  queue: { received: string; deadline: string; chips: Chip[] };
  briefing: Briefing;
  atlasTask: T;
  /** The referral exactly as the (scripted) GP sent it. */
  referral: {
    sent: string;
    received: string;
    deadline: string;
    sections: Record<SectionId, T>;
    /** The consultation note, attached. */
    noteAttachment: T;
  };
  /** The scripted GP's own uncertainty, sent with the referral (ATLAS view only). */
  gpUncertainty?: { tags: TagId[]; description: T; confidence: ConfLevel; placement: number };
  /** Criteria the sent referral mentions, as Informasjonsguiden showed them when it was sent. */
  guideAsReceived: CriterionId[];
  /** Erlend: a plain line from DPS's own record, allowed in the case-only state. */
  ownRecordLine?: T;
  /** Erlend (ATLAS view): the previous outcome card. */
  previousReferral?: PreviousReferral;
  systemReading?: SystemReading;
  /** The GP side, scripted for DPS participants. */
  gpScript: {
    /** Reply to «Be om mer informasjon», 2026-03-20. */
    replyToRequest?: Message;
    /** Acknowledgement of «Retur med råd», 2026-03-20. */
    ackOfReturn?: Message;
    /** Astrid, ATLAS view: the GP's question as the prototype has it. */
    question?: Message;
    /** Astrid, case-only: a plain question that refers only to the plain letter. */
    questionPlain?: Message;
  };
  /** Astrid: the return the team sent on 2026-03-16 (ATLAS view). */
  returnSent?: StructuredReturn;
  /** Astrid: the referral and the return as one plain letter (case-only view; same text as the GP's case-only letter for the return part). */
  plainLetter?: Letter;
}

export interface Debrief {
  /** Shown in both modes: what happened in this case, in third person. May use the placeholders {{beslutning}}, {{trygghet}}, {{utfall}}. */
  title: T;
  whatHappened: T;
  /** What the case was built to test. Study mode shows it only on the Takk page; review mode shows it behind Merknader. */
  purpose: T;
}

export interface CaseContent {
  id: CaseId;
  vignette: 'V1' | 'V2' | 'V3' | 'V4' | 'practice';
  patient: { name: string; age: number; initials: string; fnr: string };
  /** Erlend: «Kliniske detaljer for Erlend er utkast skrevet for prototypen og må kvalitetssikres av klinikere.» shown on both sides. */
  draftFlag?: T;
  gp: GpCase;
  /** Torbjørn has no DPS side. */
  dps?: DpsCase;
  debrief: { gp: Debrief; dps?: Debrief };
}

/** V5: two GPs, one patient (optional, both roles). A GP-side view, never inside a DPS screen. */
export interface V5Content {
  title: T;
  intro: T;
  patientLine: T;
  gps: {
    id: 'a' | 'b';
    label: T;
    experience: T;
    pattern: PatternData;
    note: T;
  }[];
  purpose: T;
}

export interface PatternData {
  asOf: string;
  period: T;
  total: number;
  outcomes: { key: 'rett' | 'retur' | 'avslatt' | 'venter'; label: T; count: number }[];
  returnReasons: { reason: ReasonId; count: number }[];
  quarters: { label: T; count: number }[];
  footnote: T;
}

export interface SharedOverview {
  kalibrering: {
    intro: T;
    catchment: { label: T; value: T }[];
    commonReasons: { reason: ReasonId; share: T }[];
    criteriaLog: Dated[];
  };
  dialog: {
    intro: T;
    discussion: { title: T; posts: { role: Role; date: string; text: T }[] };
  };
}

export interface TourStep {
  id: string;
  /** Which element the step shows, under the questionnaire's name. */
  title: T;
  /** What the element shows and where its information comes from. Never what it is for. */
  body: T;
  /** An optional thing to try, as a short imperative about interface mechanics. */
  tryIt?: T;
  /** Why the element exists. Hidden in study mode until Takk. */
  reason: T;
  /** The live component the frame shows. */
  frame: string;
  /** A one-time bridge to the questionnaire's term, in its exact words. */
  bridge?: T;
}

export interface TourContent {
  gp: { parts: { title: T; steps: TourStep[] }[] };
  dps: { parts: { title: T; steps: TourStep[] }[] };
  closing: { title: T; body: T; seenTitle: T };
}

export interface DesignNote {
  id: string;
  title: T;
  text: T;
}

export interface GlossaryEntry {
  term: T;
  text: T;
}

/** An ordinary patient on the GP's timeliste: visible, never openable. */
export interface OrdinaryPatient {
  id: string;
  time: string;
  name: string;
  age: number;
  initials: string;
  fnr: string;
  visit: T;
}

/* ---------- Shared vocabulary (vocab.json) ---------- */

export interface Vocab {
  tags: Record<TagId, { label: T; definition: T }>;
  confidence: Record<ConfLevel, T>;
  /** The order the confidence steps are shown in. */
  confidenceOrder: ConfLevel[];
  criteria: Record<CriterionId, { label: T; dpsLooksFor: T }>;
  behandlingsnytte: { label: T; text: T };
  sections: Record<SectionId, { label: T; guide: T; criterion?: CriterionId }>;
  sectionOrder: SectionId[];
  reasons: Record<ReasonId, T>;
  reasonOrder: ReasonId[];
  outcomes: Record<Outcome, { label: T; icon: 'question' | 'enter' | 'reply' }>;
  outcomeOrder: Outcome[];
  sources: Record<Source, T>;
  roles: { gp: T; dps: T; gpTeam: T; dpsTeam: T };
  band: { caption: T; left: T; middle: T; right: T; own: T; other: Record<Role, T>; system: T; illustration: T; reasoningLabel: T };
}

/* ---------- The evaluation instrument (instrument.json) ---------- */

export type FormKey =
  | 'S1'
  | 'S2.fastlege'
  | 'S2.dps'
  | 'S3'
  | 'S4.fastlege'
  | 'S4.dps'
  | 'S5.fastlege'
  | 'S5.dps'
  | 'S6'
  | 'S7.fastlege'
  | 'S8'
  | 'R1'
  | 'R2';

export type ItemType =
  | 'locked' // a «Tekstsvar» filled and locked by ATLAS
  | 'agree7' // 1 Helt uenig to 7 Helt enig
  | 'confidence7' // 1 Svært usikker to 7 Svært sikker
  | 'helpful7' // 1 Ikke nyttig to 7 Svært nyttig (Appendix E item 4)
  | 'nps11' // 0 Svært lite sannsynlig to 10 Svært sannsynlig
  | 'clarity5' // R1: 1 to 5
  | 'importance3' // R1: Lite, Middels, Svært viktig
  | 'choice' // single choice with listed options
  | 'text' // short text
  | 'longtext' // 1 to 3 sentences, max 3,800 characters
  | 'stop' // the stop page text in a vignette form
  | 'consent'; // S1: one required tick box (its one option, «Ja»), consent to take part

export interface InstrumentItem {
  /** NSK item ID (for example D-V1-B1) or a new ID (E11-check, R1-clarity). */
  id: string;
  type: ItemType;
  /** Nettskjema codebook name: lowercase, unique in the form, no æøå. */
  codebook: string;
  text: T;
  options?: T[];
  anchors?: { low: T; high: T };
  required: boolean;
  /** Free text shows «Ikke skriv opplysninger om pasienter eller andre personer.» above it. */
  privacyLine?: boolean;
  /** A DPS wording drafted for the owner's approval (Appendix E item 5). */
  draft?: boolean;
}

export interface InstrumentPage {
  items: InstrumentItem[];
}

export interface InstrumentForm {
  key: FormKey;
  title: T;
  /** The consent line and the privacy line sit at the top of every form. */
  intro: T;
  /** Locked context fields this form carries, in order. */
  locked: ('rolle' | 'intervju' | 'studienavn' | 'steg' | 'vignett' | 'versjon' | 'side' | 'seksjon')[];
  pages: InstrumentPage[];
  receipt: T;
}

export interface Instrument {
  consentLine: T;
  privacyLine: T;
  lockedHeading: T;
  forms: InstrumentForm[];
}
