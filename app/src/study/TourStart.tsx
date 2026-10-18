import { Button, Dialog, DialogSurface, DialogTitle, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight20Regular, Beaker16Regular, Dismiss20Regular, DocumentBulletList16Regular, Map16Regular, TextBulletListSquare16Regular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useLang } from '../i18n/i18n';
import type { StringKey } from '../i18n/strings';
import { navigate } from '../router/router';
import { useStudy } from '../state/study';
import { GuideImage, SheenButton } from '../patterns/basics';
import { guide } from '../theme/constants';

const useStyles = makeStyles({
  surface: {
    padding: 0,
    width: '100%',
    maxWidth: 'min(1040px, calc(100vw - 32px))',
    borderRadius: '14px',
    overflowY: 'auto',
    maxHeight: 'calc(100dvh - 32px)',
  },
  head: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    paddingInline: 'clamp(20px, 3vw, 28px)',
    paddingBlockStart: '24px',
    paddingBlockEnd: '12px',
    borderRadius: '14px 14px 0 0',
    background: `linear-gradient(180deg,rgba(255,255,255,0) 35%,#FFFFFF 100%), linear-gradient(120deg,#FFF3EC 0%,#FDEDF5 52%,#F1EEFC 100%)`,
    '@media (forced-colors: active)': { background: 'Canvas' },
  },
  headText: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  eyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  title: { ...typographyStyles.title2, margin: 0 },
  close: { flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.7)' },
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: '24px',
    paddingInline: 'clamp(20px, 3vw, 28px)',
    paddingBlockEnd: '20px',
    '@media (min-width: 840px)': { gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)' },
  },
  left: { display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 },
  intro: { ...typographyStyles.body2, margin: 0 },
  tiles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' },
  tile: {
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr)',
    columnGap: '10px',
    alignItems: 'start',
    padding: '12px',
    borderRadius: '10px',
    border: `1px solid ${guide.cardEdge}`,
    backgroundColor: '#FFF8F4',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  tileIcon: {
    width: '28px',
    height: '28px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: '#FFE9DE',
    color: guide.ink,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { ...typographyStyles.body1Strong, margin: 0 },
  tileText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  faq: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  faqTitle: { ...typographyStyles.subtitle2, margin: 0, paddingBlockEnd: '8px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  details: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  summary: {
    ...typographyStyles.body1Strong,
    cursor: 'pointer',
    paddingBlock: '10px',
    paddingInline: '4px',
    listStylePosition: 'inside',
    borderRadius: tokens.borderRadiusSmall,
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  answer: { ...typographyStyles.body1, margin: 0, paddingInline: '4px', paddingBlockEnd: '12px', color: tokens.colorNeutralForeground2 },
  foot: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    paddingInline: 'clamp(20px, 3vw, 28px)',
    paddingBlock: '14px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  footNote: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  footActions: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
});

function Tile({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const cls = useStyles();
  return (
    <div className={cls.tile}>
      <span className={cls.tileIcon} aria-hidden="true">
        {icon}
      </span>
      <div>
        <h3 className={cls.tileTitle}>{title}</h3>
        <p className={cls.tileText}>{children}</p>
      </div>
    </div>
  );
}

/**
 * The card before the tour (decision 2, board 9a): what the tour shows, that the practice patient keeps nothing, how a
 * case runs, and four common questions. «Start omvisningen» starts it; «Ikke nå» goes back to the overview.
 */
export function TourStartDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const gp = (study.role ?? 'gp') === 'gp';
  const faq: [StringKey, StringKey][] = [
    ['faqDecideQ', 'faqDecideA'],
    gp ? ['faqPatternQ', 'faqPatternA'] : ['faqSenderQ', 'faqSenderA'],
    ['faqWorkQ', 'faqWorkA'],
    ['faqSourceQ', 'faqSourceA'],
  ];
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface className={cls.surface} data-tour-start="">
        <div className={cls.head}>
          <GuideImage variant="header" />
          <div className={cls.headText}>
            <p className={cls.eyebrow}>{s('tourStartEyebrow')}</p>
            <DialogTitle as="h2" className={cls.title}>
              {s('tourStartTitle')}
            </DialogTitle>
          </div>
          <Button className={cls.close} appearance="subtle" icon={<Dismiss20Regular />} aria-label={s('close')} onClick={onClose} />
        </div>
        <div className={cls.body}>
          <div className={cls.left}>
            <p className={cls.intro}>{s(gp ? 'tourStartIntroGp' : 'tourStartIntroDps')}</p>
            <div className={cls.tiles}>
              <Tile icon={<Map16Regular />} title={s('tourStartPartsTitle')}>
                {s('tourStartPartsText')}
              </Tile>
              <Tile icon={<Beaker16Regular />} title={s('tourStartPracticeTitle')}>
                {s('tourStartPracticeText')}
              </Tile>
              <Tile icon={<TextBulletListSquare16Regular />} title={s('tourStartWhereTitle')}>
                {s(gp ? 'tourStartWhereGp' : 'tourStartWhereDps')}
              </Tile>
              <Tile icon={<DocumentBulletList16Regular />} title={s('tourStartCaseTitle')}>
                {s('tourStartCaseText')}
              </Tile>
            </div>
          </div>
          <section className={cls.faq} aria-labelledby="tour-start-faq">
            <h3 id="tour-start-faq" className={cls.faqTitle}>
              {s('tourStartFaqTitle')}
            </h3>
            {faq.map(([q, a]) => (
              // One answer open at a time where the browser supports a named group; elsewhere each opens on its own.
              <details key={q} className={cls.details} name="atlas-faq">
                <summary className={cls.summary}>{s(q)}</summary>
                <p className={cls.answer}>{s(a)}</p>
              </details>
            ))}
          </section>
        </div>
        <div className={cls.foot}>
          <p className={cls.footNote}>{s('tourStartRequired')}</p>
          <div className={cls.footActions}>
            <Button size="large" onClick={onClose}>
              {s('tourStartNotNow')}
            </Button>
            <SheenButton
              icon={<ArrowRight20Regular />}
              iconPosition="after"
              onClick={() => {
                study.setTour({ started: true });
                navigate('/studie/omvisning');
              }}
            >
              {s('studyCardStartTour')}
            </SheenButton>
          </div>
        </div>
      </DialogSurface>
    </Dialog>
  );
}
