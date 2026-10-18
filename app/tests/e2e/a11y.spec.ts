import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema, configWithoutForms } from './mock';
import { clickThroughTour, finishCaseHome, openCurrentCase, panel, place, sendForm, startStudy, toHome, toStopPage } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

// Scan settled states: a toast caught mid-fade reads as low contrast. Fluent's motion honours reduced motion.
// (A context option: a bare `reducedMotion` in test.use is not one, and was silently ignored.)
test.use({ contextOptions: { reducedMotion: 'reduce' } });

/** Serious and critical axe violations in ATLAS's own markup (the Nettskjema frame is outside it). */
async function scan(page: Page, where: string, found: string[]) {
  await page.waitForTimeout(200);
  // A toast fades in over about 100 ms; axe reads it mid-fade as low contrast, so let it settle.
  if (await page.locator('.fui-Toast').count()) await page.waitForTimeout(600);
  // Any fade or transition still running ends first: axe blends a part-faded panel into its colours (a CI run read a
  // brand button at 4.47:1 mid-fade, 4.62:1 at rest).
  await page.evaluate(() => {
    const ending = document
      .getAnimations()
      .filter((a) => Number.isFinite(Number(a.effect?.getComputedTiming().endTime)))
      .map((a) => a.finished.catch(() => undefined));
    return Promise.race([Promise.all(ending), new Promise((done) => setTimeout(done, 2000))]);
  });
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('iframe')
    // Fluent UI's Tabster focus sentinels: focusable but aria-hidden by design; they pass focus on at once.
    .exclude('[data-tabster-dummy]')
    .analyze();
  for (const v of result.violations) {
    if (v.impact === 'serious' || v.impact === 'critical') {
      // The colours axe read go with a contrast finding, so a failure in CI says what it saw.
      const detail = (n: (typeof v.nodes)[number]) => {
        const d = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
        return d?.fgColor ? ` [${d.fgColor} on ${d.bgColor}, ${d.contrastRatio}:1]` : '';
      };
      found.push(`${where}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')}${detail(n)} ${n.html.slice(0, 80)}`).join(' | ')}`);
    }
  }
}

test('study screens have no serious or critical axe violations', async ({ page }) => {
  // Some forty scans, one per state of the journey.
  test.setTimeout(300_000);
  const found: string[] = [];
  await mockNettskjema(page);
  await page.goto('/');
  await scan(page, 'velkommen', found);
  await startStudy(page, 'Fastlege');
  await scan(page, 'om-deg with S1', found);
  await sendForm(page);
  await scan(page, 'om-deg sent', found);
  await toHome(page);
  await scan(page, 'home before the tour', found);
  await page.locator('[data-study-card] [data-name-what]').click();
  await scan(page, 'study name popover', found);
  await page.keyboard.press('Escape');
  await page.locator('[data-start-tour]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByText('Bestemmer ATLAS for meg?').click();
  await scan(page, 'tour card', found);
  await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
  await scan(page, 'tour: the overview', found);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /^(Neste|Neste del)$/ }).click();
    await scan(page, `tour: study step ${i + 2}`, found);
  }
  await page.getByRole('button', { name: 'Neste del' }).click();
  await scan(page, 'tour timeliste', found);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^(Neste|Neste del)$/ }).click();
  await place(page, 2);
  await scan(page, 'tour band placed', found);
  await clickThroughTour(page);
  await scan(page, 'tour end', found);
  await page.getByRole('button', { name: 'Til oversikten' }).click();
  await scan(page, 'home after the tour', found);
  await page.locator('[data-feedback-tab]').click();
  await scan(page, 'feedback parts on home', found);
  await page.keyboard.press('Escape');
  await openCurrentCase(page);
  await scan(page, 'kari briefing', found);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await toStopPage(page);
  await scan(page, 'kari case-only', found);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await scan(page, 'kari atlas', found);
  await place(page, 3);
  await page.getByRole('button', { name: 'Diagnostisk', exact: true }).click();
  await page.getByLabel('Middels').check({ force: true });
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await scan(page, 'kari decided', found);
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await scan(page, 'kari referral', found);
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await scan(page, 'kari sent with form', found);
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await scan(page, 'kari dialog', found);
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await scan(page, 'kari summary with its question', found);
  await page.locator('[data-prompt-feedback]').click();
  await scan(page, 'case parts', found);
  await page.locator('[data-feedback-part="hele"]').click();
  await expect(panel(page)).toBeVisible();
  await scan(page, 'S9 in the panel', found);
  await sendForm(page);
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toBeVisible();
  await scan(page, 'S9 sent', found);
  await finishCaseHome(page);
  await scan(page, 'home after kari', found);
  await page.goto('/#/studie/steg');
  await scan(page, 'stepper', found);
  await page.goto('/#/studie/velkommen');
  await scan(page, 'velkommen, back', found);
  await page.getByRole('button', { name: 'Ikke deg? Start som ny deltaker' }).click();
  await scan(page, 'new participant dialog', found);
  expect(found, found.join('\n')).toEqual([]);
});

test('the DPS overview and the closed study have no serious or critical axe violations', async ({ page }) => {
  const found: string[] = [];
  await mockNettskjema(page);
  await startStudy(page, 'DPS-kliniker');
  await sendForm(page);
  await toHome(page);
  await scan(page, 'dps home', found);
  await page.unroute('**/atlas-config.json*');
  await mockNettskjema(page, { closes: '2026-02-27', opens: '2026-01-05' });
  await page.goto('/#/studie/velkommen');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Studien er avsluttet' })).toBeVisible();
  await scan(page, 'velkommen, closed', found);
  expect(found, found.join('\n')).toEqual([]);
});

test('review screens have no serious or critical axe violations', async ({ page }) => {
  const found: string[] = [];
  await mockNettskjema(page);
  await page.goto('/#/gjennomgang');
  await scan(page, 'review landing', found);
  await page.getByLabel('Veileder').check({ force: true });
  await page.getByRole('switch', { name: 'Merknader' }).click();
  const paths = [
    '/#/gjennomgang/fastlege/timeliste',
    '/#/gjennomgang/fastlege/sak/kari/orientering',
    '/#/gjennomgang/fastlege/sak/kari/konsultasjon',
    '/#/gjennomgang/fastlege/sak/erlend/henvisning',
    '/#/gjennomgang/fastlege/sak/astrid/konsultasjon',
    '/#/gjennomgang/fastlege/monster',
    '/#/gjennomgang/fastlege/delt',
    '/#/gjennomgang/fastlege/omvisning',
    '/#/gjennomgang/fastlege/to-fastleger',
    '/#/gjennomgang/dps/mottatte',
    '/#/gjennomgang/dps/sak/kari/vurdering',
    '/#/gjennomgang/dps/sak/erlend/vurdering',
    '/#/gjennomgang/dps/sak/astrid/vurdering',
    '/#/gjennomgang/tilbakemeldinger',
  ];
  for (const p of paths) {
    await page.goto(p);
    await scan(page, p, found);
  }
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'Uten ATLAS', exact: true }).click();
  await scan(page, 'kari without atlas (review)', found);
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).first().click();
  await scan(page, 'feedback picker', found);
  expect(found, found.join('\n')).toEqual([]);
});
