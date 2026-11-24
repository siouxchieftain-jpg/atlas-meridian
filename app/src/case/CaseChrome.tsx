import {
  Button,
  ToggleButton,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ArrowSwap20Regular, Eye20Regular, EyeOff20Regular } from '@fluentui/react-icons';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { CaseId, CoreCaseId } from '../content/types';
import { cases } from '../content';
import { useLang } from '../i18n/i18n';
import { currentPath, navigate } from '../router/router';
import { browseFlag } from '../state/persist';
import { useWork } from '../state/work';
import { useFormHostOptional } from '../study/formHost';
import { DesignNote, useSelectedToggle } from '../patterns/basics';
import { Silent } from '../patterns/announce';
import { AtlasPanelHead } from './CaseLayout';
import { GuideTaskStrip, TaskParts } from '../guide/GuideLayer';
import { remainingKey } from './Scenario';
import { useCaseStatus } from './useCaseStatus';
import { AtlasCard, clearArrival, hasArrival, markLockedSeen } from '../patterns/AtlasCard';

const useStyles = makeStyles({
  lockedLead: { ...typographyStyles.body1Strong, margin: 0, color: tokens.colorNeutralForeground2 },
  lockedLine: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  reason: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0, flexBasis: '100%' },
  // The study's case-only notice: one message bar under the case title (G-16).
  noticeLine: { display: 'block', marginBlockStart: '2px' },
  group: { display: 'inline-flex', gap: '2px' },
  spacer: { flexGrow: 1 },
  placeholder: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  /** Review controls are for the screen, not for paper. */
  noPrint: { '@media print': { display: 'none' } },
});

/** Cases with a DPS side, for «Se fra den andre siden». */
/**
 * The same moment on the other side (review mode, SV-19): the briefing to the
 * briefing, the GP's work to the DPS assessment that receives it, a sent page
 * to where the other side reads it, the thread to the thread and the summary
 * to the summary.
 */
export function otherSidePath(caseId: CaseId, viewer: 'gp' | 'dps', view?: string): string | null {
  if (!cases[caseId].dps || caseId === 'sofie') return null;
  if (viewer === 'gp') {
    const to =
      view === 'orientering' || view === 'oppsummering' ? view : view === 'dialog' || view === 'plan' ? 'dialog' : 'vurdering';
    return `/gjennomgang/dps/sak/${caseId}/${to}`;
  }
  const gpWork = caseId === 'erlend' ? 'henvisning' : 'konsultasjon';
  const to = view === 'orientering' || view === 'oppsummering' ? view : view === 'dialog' || view === 'sendt' ? 'dialog' : gpWork;
  return `/gjennomgang/fastlege/sak/${caseId}/${to}`;
}

/** The last side switch, so that switching back returns to the view the reviewer came from (r9F-07). */
let lastSwitch: { from: string; to: string } | null = null;
const caseAndSide = (p: string) => p.split('/').slice(2, 5).join('/');

/** «Se fra den andre siden» and the role switch: to the same moment on the other side, or back to where the reviewer was. */
export function goToOtherSide(target: string) {
  const here = currentPath();
  const back = lastSwitch && lastSwitch.to === here && caseAndSide(lastSwitch.from) === caseAndSide(target) ? lastSwitch.from : null;
  const to = back ?? target;
  lastSwitch = { from: here, to };
  navigate(to);
}

/** «Se fra den andre siden» on the pages without the case bar (review mode only). */
export function OtherSideButton({ caseId, view }: { caseId: CaseId; view: string }) {
  const { s } = useLang();
  const work = useWork();
  if (work.mode !== 'review') return null;
  const other = otherSidePath(caseId, work.viewer, view);
  if (!other) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }} data-no-print="">
      <Button size="small" appearance="subtle" icon={<ArrowSwap20Regular />} onClick={() => goToOtherSide(other)}>
        {s('seeOtherSide')}
      </Button>
    </div>
  );
}

/**
 * The bar under a case view's title. Study, case-only state: an informative message bar, «Uten ATLAS», with «Vis
 * ATLAS» as its action while the form panel is out of sight (the panel carries its own, with the reason, G-18).
 * Review: the «Uten ATLAS» / «Med ATLAS» switch and «Se fra den andre siden».
 */
export function CaseModeBar({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const { s } = useLang();
  const work = useWork();
  const host = useFormHostOptional();
  const sel = useSelectedToggle();
  const reasonId = useId();
  const core = caseId === 'kari' || caseId === 'erlend' || caseId === 'astrid';
  if (work.mode === 'study') {
    if (!work.withoutAtlas(caseId) || !core) return null;
    const can = work.canShowAtlas(caseId as CoreCaseId);
    // One «Vis ATLAS» at a time: the form panel's while the panel shows it, else this bar's (Meridian: one primary action).
    const panelShows = !!host?.form && host.visible && host.form.caseId === caseId;
    // 3.8: the locked ATLAS card, in the place ATLAS will open (Jishnu, 24 November). It names what is hidden, never
    // what ATLAS will show. Silent: part of the page, read with it; not news to announce (G-32).
    return (
      <Silent>
        <LockedSeen caseId={caseId} />
        <AtlasCard on={false} locked>
          <p className={cls.lockedLead}>{s('lockedLead')}</p>
          <p className={cls.lockedLine}>
            {work.viewer === 'gp' ? s('lockedThinkGp') : caseId === 'astrid' ? s('lockedThinkDpsAstrid') : s('lockedThinkDps')}
          </p>
          {!can && !panelShows && (
            <p className={cls.lockedLine} id={reasonId}>
              {s('showAtlasReason')}
            </p>
          )}
          {!panelShows && (
            <div>
              <Button
                appearance={can ? 'primary' : 'secondary'}
                icon={<Eye20Regular />}
                disabledFocusable={!can}
                aria-describedby={!can ? reasonId : undefined}
                onClick={() => can && work.showAtlas(caseId)}
              >
                {s('showAtlas')}
              </Button>
            </div>
          )}
        </AtlasCard>
      </Silent>
    );
  }
  const other = otherSidePath(caseId, work.viewer);
  const without = work.withoutAtlas(caseId);
  return (
    <div className={mergeClasses(cls.bar, cls.noPrint)}>
      {core && (
        <div className={cls.group} role="group" aria-label={s('atlasState')}>
          <ToggleButton size="small" icon={<EyeOff20Regular />} className={mergeClasses(without && sel.on)} checked={without} onClick={() => work.hideAtlas?.(caseId)}>
            {s('utenAtlas')}
          </ToggleButton>
          <ToggleButton size="small" icon={<Eye20Regular />} className={mergeClasses(!without && sel.on)} checked={!without} onClick={() => work.showAtlas(caseId)}>
            {s('medAtlas')}
          </ToggleButton>
        </div>
      )}
      <span className={cls.spacer} />
      {other && (
        <Button size="small" appearance="subtle" icon={<ArrowSwap20Regular />} onClick={() => goToOtherSide(other)}>
          {s('seeOtherSide')}
        </Button>
      )}
      {without && <DesignNote id="uten-atlas" show={work.notes} />}
    </div>
  );
}

/** Remembers that the locked card was seen, so ATLAS arrives when it opens on this case. */
function LockedSeen({ caseId }: { caseId: CaseId }) {
  useEffect(() => markLockedSeen(caseId), [caseId]);
  return null;
}

/** The line that brings the ATLAS part of the task, shown once ATLAS is open (study). */
export function AtlasTaskBar({
  caseId,
  modules,
  summaries,
  finalStep,
}: {
  caseId: CaseId;
  modules?: Partial<Record<number, ReactNode>>;
  summaries?: Partial<Record<number, string>>;
  /** After the last part, where the work goes on (the referral page: «Neste: Skriv henvisningen»). */
  finalStep?: { label: string; onClick: () => void };
}) {
  const { s, t } = useLang();
  const work = useWork();
  const host = useFormHostOptional();
  const status = useCaseStatus(caseId);
  // With the ATLAS parts in the boxes (3.8), the task card stays after the decision: ATLAS lives there now.
  const phase = work.mode === 'study' ? work.phase(caseId) : undefined;
  const shown = work.mode === 'study' && (modules ? phase !== 'briefing' && phase !== 'uten' : phase === 'atlas');
  // ATLAS arrives once: the first time it opens on a case whose locked card was on screen.
  const arrive = useRef<boolean | null>(null);
  if (shown && arrive.current === null) arrive.current = hasArrival(caseId);
  useEffect(() => {
    if (shown && arrive.current) clearArrival(caseId);
  }, [shown, caseId]);
  if (!shown || !phase) return null;
  const c = cases[caseId];
  const task = work.viewer === 'gp' ? c.gp.atlasTask : c.dps?.atlasTask;
  if (!task) return null;
  // The task line is the guide's task strip, with the page's markers as numbered steps (3.7).
  const view = currentPath().split('/')[4];
  // «Se deg rundt» has no form to hold.
  const held = !browseFlag() && host?.form?.caseId === caseId && host.form.stage === 'held';
  const note = held ? (
    <p style={{ margin: 0 }} data-form-held="">
      {s('formRestLater')}.
    </p>
  ) : undefined;
  if (!modules)
    return (
      <Silent>
        <GuideTaskStrip role={work.viewer} view={view} task={t(task)} note={note} />
      </Silent>
    );
  // Once every part is done, the task line says what comes next on the page (review R8).
  const gp = work.gp(caseId);
  const key = remainingKey(caseId, work.viewer, phase, status);
  const next =
    work.viewer === 'gp' && phase === 'atlas' && view === 'konsultasjon' && gp.decisionSaved && gp.decision === 'henvis'
      ? s('nextWriteReferral')
      : key
        ? s(key)
        : undefined;
  return (
    <Silent>
      <TaskParts
        caseId={caseId}
        role={work.viewer}
        view={view}
        task={t(task)}
        modules={modules}
        summaries={summaries}
        arrive={!!arrive.current}
        doneTask={next ? `${s('taskNext')}: ${next}.` : undefined}
        finalStep={finalStep}
        note={note}
      />
    </Silent>
  );
}

/** The ATLAS panel slot in the case-only state: names what is hidden, never what ATLAS is for. */
export function AtlasPlaceholder({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const { s } = useLang();
  const work = useWork();
  const reasonId = useId();
  const can = work.mode === 'study' ? work.canShowAtlas(caseId as CoreCaseId) : true;
  return (
    <>
      <AtlasPanelHead />
      <p className={cls.placeholder}>{work.mode === 'study' ? s('placeholderHidden') : s('placeholderHiddenReview')}</p>
      {work.mode === 'study' && (
        <div>
          <Button
            appearance={can ? 'primary' : 'secondary'}
            icon={<Eye20Regular />}
            disabledFocusable={!can}
            aria-describedby={!can ? reasonId : undefined}
            onClick={() => can && work.showAtlas(caseId)}
          >
            {s('showAtlas')}
          </Button>
          {!can && (
            <p className={cls.reason} id={reasonId} style={{ marginTop: 8 }}>
              {s('showAtlasReason')}
            </p>
          )}
        </div>
      )}
    </>
  );
}
