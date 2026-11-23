import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { cases } from '../content';
import type { CaseId, Role } from '../content/types';
import { useLang } from '../i18n/i18n';

const ORDER: Partial<Record<CaseId, number>> = { kari: 1, erlend: 2, astrid: 3 };

const useStyles = makeStyles({
  line: { ...typographyStyles.body1Strong, margin: 0, color: tokens.colorNeutralForeground1 },
  quiet: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
});

/**
 * The case's scenario in one short, neutral line (3.8, F51, F70, F76): what kind of case it is and what the participant
 * is asked to do. The same pattern on both roles' lists, study cards and briefings; nothing for the practice and extra
 * cases.
 */
export function scenarioText(caseId: CaseId, role: Role, t: (x: { nb: string; en: string }) => string, s: (k: 'scenarioLine' | 'scenarioKind', v: Record<string, string | number>) => string, kindOnly = false): string | null {
  const n = ORDER[caseId];
  const sc = role === 'gp' ? cases[caseId].gp.briefing.scenario : cases[caseId].dps?.briefing.scenario;
  if (!n || !sc) return null;
  return kindOnly ? s('scenarioKind', { n, kind: t(sc.kind) }) : s('scenarioLine', { n, kind: t(sc.kind), task: t(sc.task) });
}

export function ScenarioLine({ caseId, role, quiet, className }: { caseId: CaseId; role: Role; quiet?: boolean; className?: string }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const text = scenarioText(caseId, role, t, s);
  if (!text) return null;
  return (
    <p className={mergeClasses(quiet ? cls.quiet : cls.line, className)} data-scenario={caseId}>
      {text}
    </p>
  );
}

type Phase = 'briefing' | 'uten' | 'atlas' | 'page2' | 'reply' | 'debrief' | 'done';
type RemainKey =
  | 'remainStart'
  | 'remainPage1'
  | 'remainRest'
  | 'remainAtlasGpKari'
  | 'remainAtlasGpErlend'
  | 'remainAtlasGpAstrid'
  | 'remainAtlasDps'
  | 'remainAtlasDpsAstrid'
  | 'remainReplyGpKari'
  | 'remainReplyGpPlan'
  | 'remainReplyDpsKari'
  | 'remainSummary';

/**
 * What is left of a case, in one plain line (3.8, F107): «Gjenstår: svar på resten av skjemaet og send det». Null when
 * the case is done or is not one of the three.
 */
export function remainingKey(caseId: CaseId, role: Role, phase: Phase): RemainKey | null {
  if (!ORDER[caseId]) return null;
  switch (phase) {
    case 'briefing':
      return 'remainStart';
    case 'uten':
      return 'remainPage1';
    case 'atlas':
      if (role === 'gp') return caseId === 'kari' ? 'remainAtlasGpKari' : caseId === 'erlend' ? 'remainAtlasGpErlend' : 'remainAtlasGpAstrid';
      return caseId === 'astrid' ? 'remainAtlasDpsAstrid' : 'remainAtlasDps';
    case 'page2':
      return 'remainRest';
    case 'reply':
      if (role === 'gp') return caseId === 'kari' ? 'remainReplyGpKari' : 'remainReplyGpPlan';
      return caseId === 'kari' ? 'remainReplyDpsKari' : 'remainSummary';
    default:
      return null;
  }
}

const useRemainStyles = makeStyles({
  line: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground1 },
  label: { fontWeight: tokens.fontWeightSemibold },
});

/** «Gjenstår: …» under a case's title in the study, while the case is not done (3.8, F107). */
export function CaseRemaining({ caseId, role, phase, className }: { caseId: CaseId; role: Role; phase: Phase; className?: string }) {
  const cls = useRemainStyles();
  const { s } = useLang();
  const key = remainingKey(caseId, role, phase);
  if (!key) return null;
  return (
    <p className={mergeClasses(cls.line, className)} data-case-remaining={caseId}>
      <span className={cls.label}>{s('remainLabel')}:</span> {s(key)}.
    </p>
  );
}
