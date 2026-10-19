import type { StringKey } from '../i18n/strings';
import { cases } from '../content';
import type { CaseId } from '../content/types';

/**
 * The parts of each review screen a reviewer can give feedback on (R1). The
 * `side` sent to Nettskjema names the screen and, on a case screen, the case
 * (for example `fastlege/kari/konsultasjon`, `dps/mottatte`); the `seksjon` is
 * the part's ID. VIEW_SECTIONS is keyed by the screen without the case.
 */
export interface ReviewSection {
  id: string;
  label: StringKey;
}

const whole: ReviewSection = { id: 'hele', label: 'secWhole' };

export const VIEW_SECTIONS: Record<string, ReviewSection[]> = {
  'fastlege/timeliste': [whole],
  'dps/mottatte': [whole],
  'fastlege/orientering': [whole],
  'dps/orientering': [whole],
  'fastlege/konsultasjon': [
    whole,
    { id: 'profil', label: 'profile' },
    { id: 'journal', label: 'secRecord' },
    { id: 'band', label: 'bandTitle' },
    { id: 'lesning', label: 'readingTitle' },
    { id: 'uklart', label: 'unclearTitle' },
    { id: 'guide', label: 'guideTitle' },
    { id: 'trygghet', label: 'confidenceTitle' },
    { id: 'beslutning', label: 'decisionTitle' },
    { id: 'retur', label: 'readReturn' },
    { id: 'tidligere', label: 'previousReferral' },
  ],
  'fastlege/henvisning': [
    whole,
    { id: 'henvisning', label: 'secReferral' },
    { id: 'margin', label: 'secMargin' },
    { id: 'rad', label: 'secAdvice' },
    { id: 'fra-atlas', label: 'fromAtlasPanel' },
    { id: 'band', label: 'bandTitle' },
    { id: 'guide', label: 'guideTitle' },
  ],
  'dps/vurdering': [
    whole,
    { id: 'henvisning', label: 'secReferral' },
    { id: 'usikker', label: 'gpUnsure' },
    { id: 'band', label: 'bandTitle' },
    { id: 'lesning', label: 'readingTitle' },
    { id: 'guide', label: 'guideTitle' },
    { id: 'vurdering', label: 'assessmentTitle' },
    { id: 'retur', label: 'returnTheTeamSent' },
    { id: 'svar', label: 'secAnswer' },
    { id: 'tidligere', label: 'previousReferral' },
  ],
  'fastlege/sendt': [whole],
  'dps/sendt': [whole],
  'fastlege/dialog': [whole, { id: 'plan', label: 'planTitle' }],
  'dps/dialog': [whole, { id: 'endelig', label: 'finalChoice' }],
  'fastlege/plan': [whole],
  'fastlege/oppsummering': [whole],
  'dps/oppsummering': [whole],
  'fastlege/monster': [whole],
  'fastlege/delt': [whole, { id: 'kalibrering', label: 'kalibrering' }, { id: 'dialog', label: 'dialogTab' }],
  'dps/delt': [whole, { id: 'kalibrering', label: 'kalibrering' }, { id: 'dialog', label: 'dialogTab' }],
  'fastlege/omvisning': [whole],
  'dps/omvisning': [whole],
  'fastlege/to-fastleger': [whole],
  'dps/to-fastleger': [whole],
  // Study mode (S9): the start page and the list (3.4), the case as a whole from its summary page, and the study's own
  // pages. The ids the 3.3 overview used keep their meaning where the part kept its job, so earlier answers still sort.
  'fastlege/hjem': [
    whole,
    { id: 'studiekort', label: 'secStudyCard' },
    { id: 'timeliste', label: 'dayTitle' },
    { id: 'innboks', label: 'homeInboxTitle' },
    { id: 'henvisninger', label: 'refMineTitle' },
    { id: 'monster', label: 'navPattern' },
    { id: 'delt', label: 'navShared' },
  ],
  'dps/hjem': [
    whole,
    { id: 'studiekort', label: 'secStudyCard' },
    { id: 'inntak', label: 'homeDpsTitle' },
    { id: 'meldinger', label: 'homeMessagesTitle' },
    { id: 'delt', label: 'navShared' },
  ],
  'fastlege/liste': [whole, { id: 'studiekort', label: 'secStudyCard' }, { id: 'saker', label: 'listCasesLabel' }, { id: 'resten', label: 'listRoutineLabel' }],
  'dps/liste': [whole, { id: 'studiekort', label: 'secStudyCard' }, { id: 'saker', label: 'listReferralsLabel' }, { id: 'frister', label: 'queueDeadlinesTitle' }],
  'fastlege/saken': [
    { id: 'hele', label: 'secWholeCase' },
    { id: 'orientering', label: 'secBriefing' },
    { id: 'konsultasjon', label: 'secConsultation' },
    { id: 'atlas', label: 'secAtlasPanel' },
    { id: 'henvisning', label: 'secReferralPart' },
    { id: 'svaret', label: 'secReplyFromDps' },
  ],
  'dps/saken': [
    { id: 'hele', label: 'secWholeCase' },
    { id: 'orientering', label: 'secBriefing' },
    { id: 'henvisning', label: 'secReferralPart' },
    { id: 'atlas', label: 'secAtlasPanel' },
    { id: 'vurdering', label: 'secAssessmentPart' },
    { id: 'dialog', label: 'secDialogWithGp' },
  ],
};

/** The screen's name in the reader's language, for the overview (the route name is what the form receives). */
const SCREEN_LABEL: Record<string, StringKey> = {
  timeliste: 'navTimeliste',
  mottatte: 'navQueue',
  orientering: 'about',
  konsultasjon: 'consultation',
  henvisning: 'newReferral',
  vurdering: 'assessmentTitle',
  sendt: 'sentLabel',
  plan: 'planTitle',
  oppsummering: 'debrief',
  monster: 'navPattern',
  delt: 'navShared',
  omvisning: 'reviewTour',
  'to-fastleger': 'reviewV5',
  hjem: 'navHome',
  saken: 'secWholeCase',
  'om-deg': 'omDegTitle',
  helhet: 'helhetTitle',
  avslutning: 'avslutningTitle',
  ekstra: 'ekstraTitle',
  takk: 'stepTakk',
  studien: 'stepperTitle',
};

/** The screen key (`role/view`) and the case of a `side` value. */
export function screenOf(side: string): { key: string; role: string; view: string; caseId?: CaseId } {
  const parts = side.split('/');
  if (parts.length === 3 && parts[1] in cases) {
    const [role, caseId, view] = parts;
    return { key: `${role}/${view}`, role, view, caseId: caseId as CaseId };
  }
  const [role, view] = parts;
  return { key: `${role}/${view}`, role, view };
}

/** «Fastlege · Kari Nordli · Konsultasjon»: the screen in the reader's language (the form receives the `side` code). */
export function sideLabel(side: string, s: (k: StringKey) => string): string {
  const { role, view, caseId } = screenOf(side);
  const roleLabel = s(role === 'dps' ? 'roleDps' : 'roleGp');
  const screen =
    view === 'dialog'
      ? s(role === 'dps' ? 'dialogWithGp' : 'dialogWithDps')
      : view === 'liste'
        ? s(role === 'dps' ? 'navQueue' : 'homeTimelisteTitle')
        : SCREEN_LABEL[view]
          ? s(SCREEN_LABEL[view])
          : view;
  return caseId ? `${roleLabel} · ${cases[caseId].patient.name} · ${screen}` : `${roleLabel} · ${screen}`;
}

/** The `side` value from the review path: `/gjennomgang/fastlege/sak/kari/konsultasjon` → `fastlege/kari/konsultasjon`. */
export function sideOf(path: string[]): string | null {
  const [, role, a, caseId, view] = path;
  if (role !== 'fastlege' && role !== 'dps') return null;
  if (a === 'sak') return caseId && caseId in cases ? `${role}/${caseId}/${view ?? 'orientering'}` : null;
  return a ? `${role}/${a}` : null;
}

/** The review path of a `side` value (for links from the overview). */
export function pathOfSide(side: string): string {
  const { role, view, caseId } = screenOf(side);
  return caseId ? `/gjennomgang/${role}/sak/${caseId}/${view}` : `/gjennomgang/${role}/${view}`;
}

/** A part by its ID, whatever the screen shows now: for the names of parts already chosen. */
export function partOf(side: string, id: string | undefined): ReviewSection | undefined {
  return (VIEW_SECTIONS[screenOf(side).key] ?? [whole]).find((x) => x.id === id);
}

/**
 * The parts that exist on this screen for this case. `second`: the GP's referral screen shows the new referral after
 * «Henvis på nytt» (Astrid always; Kari and Erlend after a return the DPS side played), with DPS's advice and no ATLAS
 * panel or band (r4F-04, r10A-05).
 */
export function sectionsFor(side: string, second = false): ReviewSection[] {
  const { key, caseId } = screenOf(side);
  const all = VIEW_SECTIONS[key] ?? [{ id: 'hele', label: 'secWhole' }];
  return all.filter((sec) => {
    if (sec.id === 'retur') return caseId === 'astrid';
    if (sec.id === 'svar') return caseId === 'astrid';
    if (sec.id === 'tidligere') return caseId === 'erlend';
    if (key === 'fastlege/konsultasjon' && caseId === 'astrid') return !['band', 'lesning', 'uklart', 'trygghet', 'beslutning'].includes(sec.id);
    if (key === 'fastlege/konsultasjon' && caseId === 'erlend') return sec.id !== 'beslutning';
    if (key === 'fastlege/henvisning') return caseId === 'astrid' || second ? !['fra-atlas', 'band'].includes(sec.id) : sec.id !== 'rad';
    if (key === 'dps/vurdering' && caseId === 'astrid') return !['band', 'lesning', 'usikker', 'vurdering'].includes(sec.id);
    // The case as a whole (study): DPS's Astrid case is the GP's question and the answer, with no assessment of its own.
    if (key === 'dps/saken' && caseId === 'astrid') return sec.id !== 'vurdering';
    return true;
  });
}

/** The cases each role can open in review mode, in list order. */
export const REVIEW_CASES: Record<'fastlege' | 'dps', CaseId[]> = {
  fastlege: ['kari', 'erlend', 'astrid', 'torbjorn'],
  dps: ['kari', 'erlend', 'astrid'],
};

/** The screens of the overview, per role: list and case screens, then the views beside the cases. */
export const OVERVIEW_SCREENS: Record<'fastlege' | 'dps', { before: string[]; caseViews: string[]; after: string[] }> = {
  fastlege: { before: ['timeliste'], caseViews: ['orientering', 'konsultasjon', 'henvisning', 'sendt', 'dialog', 'plan', 'oppsummering'], after: ['monster', 'delt', 'omvisning', 'to-fastleger'] },
  dps: { before: ['mottatte'], caseViews: ['orientering', 'vurdering', 'sendt', 'dialog', 'oppsummering'], after: ['delt', 'omvisning', 'to-fastleger'] },
};
