import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema, configWithoutForms } from './mock';
import { doTour, panel, place, sendForm, startStudy, toStopPage } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

// Scan settled states: a toast caught mid-fade reads as low contrast. Fluent's motion honours reduced motion.
test.use({ reducedMotion: 'reduce' });

/** Serious and critical axe violations in ATLAS's own markup (the Nettskjema frame is outside it). */
async function scan(page: Page, where: string, found: string[]) {
  await page.waitForTimeout(200);
  // A toast fades in over about 100 ms; axe reads it mid-fade as low contrast, so let it settle.
  if (await page.locator('.fui-Toast').count()) await page.waitForTimeout(600);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('iframe')
    // Fluent UI's Tabster focus sentinels: focusable but aria-hidden by design; they pass focus on at once.
    .exclude('[data-tabster-dummy]')
    .analyze();
  for (const v of result.violations) {
    if (v.impact === 'serious' || v.impact === 'critical') {
      found.push(`${where}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
  }
}

test('study screens have no serious or critical axe violations', async ({ page }) => {
  const found: string[] = [];
  await mockNettskjema(page);
  await page.goto('/');
  await scan(page, 'velkommen', found);
  await startStudy(page, 'Fastlege');
  await scan(page, 'om-deg with S1', found);
  await sendForm(page);
  await page.getByRole('button', { name: 'Gå til omvisningen' }).click();
  await scan(page, 'tour timeliste', found);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^(Neste|Neste del)$/ }).click();
  await place(page, 2);
  await scan(page, 'tour band placed', found);
  await page.goto('/#/studie/omvisning');
  for (let i = 0; i < 20; i++) {
    if (await page.getByRole('button', { name: 'Ja, gå videre' }).isVisible()) break;
    await page.getByRole('button', { name: /^(Neste|Neste del|Se oversikten)$/ }).click();
  }
  await scan(page, 'tour end', found);
  await page.getByRole('button', { name: 'Ja, gå videre' }).click();
  await scan(page, 'helhet', found);
  await sendForm(page);
  await page.getByRole('button', { name: 'Gå til den første saken' }).click();
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
  await scan(page, 'kari summary', found);
  await page.goto('/#/studie/steg');
  await scan(page, 'stepper', found);
  await page.goto('/#/studie/liste');
  await scan(page, 'timeliste', found);
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
