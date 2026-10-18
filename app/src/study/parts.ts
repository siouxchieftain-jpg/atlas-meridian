import type { CoreCaseId, Role } from '../content/types';
import type { StringKey } from '../i18n/strings';
import { stepIndex } from '../state/study';
import type { StepId, StudyState } from '../state/types';

/** The three cases, in the study's fixed order (decision 8). */
export const CORE: CoreCaseId[] = ['kari', 'erlend', 'astrid'];

/**
 * v3.1 shows the study as three parts, not nine steps: «Bli kjent» (welcome, Om deg, the tour), the three cases, and
 * «Avslutning» (S2, S6, the extras and Takk).
 */
export type StudyPart = 1 | 2 | 3;

export function partOf(furthest: StepId): StudyPart {
  const i = stepIndex(furthest);
  if (i <= stepIndex('omvisning')) return 1;
  if (i <= stepIndex('astrid')) return 2;
  return 3;
}

/** The first of the three cases that is not done; none once all three are. */
export function currentCase(state: StudyState): CoreCaseId | undefined {
  return CORE.find((c) => state.phase[c] !== 'done');
}

export function casesDone(state: StudyState): number {
  return CORE.filter((c) => state.phase[c] === 'done').length;
}

/** A case between «Start saken» and its summary. */
export function caseInProgress(state: StudyState, c: CoreCaseId): boolean {
  const p = state.phase[c] ?? 'briefing';
  return p !== 'briefing' && p !== 'done';
}

/** «Tre pasienter» for the GP, «Tre henvisninger» for DPS. */
export function partTwoLabel(role: Role): StringKey {
  return role === 'gp' ? 'partCasesGp' : 'partCasesDps';
}

/** The path segment the `side` values use for the role. */
export function roleSeg(role: Role): 'fastlege' | 'dps' {
  return role === 'gp' ? 'fastlege' : 'dps';
}

/**
 * The `side` a study page sends with S9: the screen, and on a case screen the case
 * (`fastlege/kari/konsultasjon`, `dps/hjem`). A case's summary page asks about the case as a whole, so it is
 * `<role>/<case>/saken`, with the case's parts. Before S1 is sent there is no feedback.
 */
export function studySide(role: Role, path: string[]): string | null {
  const [, section, a, b] = path;
  const seg = roleSeg(role);
  switch (section) {
    case undefined:
    case 'velkommen':
      return null;
    case 'sak': {
      if (!a) return null;
      if (!b || b === 'orientering') return `${seg}/${a}/orientering`;
      if (b === 'oppsummering') return `${seg}/${a}/saken`;
      return `${seg}/${a}/${b}`;
    }
    case 'ekstra':
      return a === 'to-fastleger' ? `${seg}/to-fastleger` : `${seg}/ekstra`;
    case 'steg':
      return `${seg}/studien`;
    default:
      return `${seg}/${section}`;
  }
}
