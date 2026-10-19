import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { configWithoutForms, mockNettskjema } from './mock';
import { sendForm, startStudy, toHome } from './helpers';

// ATLAS 3.5.1: the tour comes before case 1, so «Mitt henvisningsmønster» and Delt oversikt's Kalibrering show their
// layout only. No rate, count or return reason reaches a participant before their answers without ATLAS (G-38; the
// 3.4 flow review's B1 asked the tour to be checked for the same lines as the start page). Part 3 still shows them.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

const REASONS = ['Situasjonell krise', 'Funksjonsnedgang for kort varighet', 'Kommunalt tilbud ikke utprøvd', 'Utilstrekkelig informasjon', 'Annen årsak'];
const HELD = /^Uten tall i omvisningen\. Tallene vises når de tre sakene er ferdige\.$/;

/** S1 sent, then the card before the tour and into its first step. */
async function startTour(page: Page, role: 'Fastlege' | 'DPS-kliniker') {
  await mockNettskjema(page);
  await startStudy(page, role, 'Nei');
  await sendForm(page);
  await toHome(page);
  await page.locator('[data-start-tour]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
  await expect(page.locator('[data-tour-frame]')).toBeVisible();
}

/** On through the tour until its live window is titled `title`. */
async function tourTo(page: Page, title: string) {
  const win = page.locator('[data-tour-frame]');
  for (let i = 0; i < 30; i++) {
    if ((await win.getAttribute('aria-label')) === `Levende eksempel: ${title}`) return win;
    await page.getByRole('button', { name: /^(Neste|Neste del)$/ }).click();
  }
  throw new Error(`the tour has no step titled ${title}`);
}

/** The window holds back its figures: the held line, and no rate, count, reason or «Fiktive tall». */
async function held(page: Page, title: string) {
  const win = await tourTo(page, title);
  await expect(win.locator('[data-held]')).toHaveText(HELD);
  const text = await win.innerText();
  expect(text).not.toContain('%');
  expect(text).not.toContain('Oftest oppgitt');
  expect(text).not.toContain('Fiktive tall');
  expect(text).not.toContain('Ingen data ennå');
  for (const r of REASONS) expect(text, `${title} names «${r}»`).not.toContain(r);
  return { win, text };
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .include('[data-tour-frame]')
    .analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test('GP: the tour shows the pattern and Kalibrering as layouts, with no figure and no return reason', async ({ page }) => {
  await startTour(page, 'Fastlege');

  const pattern = await held(page, 'Mitt henvisningsmønster');
  // The outcomes are named with nothing beside them: «Ingen» would say there were none.
  await expect(pattern.win).toContainText('Rett til helsehjelp');
  await expect(pattern.win).toContainText('Retur med råd');
  expect(pattern.text).not.toMatch(/\d/);
  expect(pattern.text).not.toContain('Ingen\n');
  await expect(page.getByText('Her vises bare oppsettet: tallene, som er fiktive, vises når de tre sakene er ferdige.', { exact: false })).toBeVisible();
  await axe(page);

  const kal = await held(page, 'Delt oversikt: Kalibrering');
  // The log of changes to the criteria stays: it names no case's reason and no rate.
  await expect(kal.win).toContainText('Ved spørsmål om ADHD hos voksne');
  expect(kal.text).not.toContain('1 182');
  expect(kal.text).not.toContain('virkedager');
  await expect(page.getByText('Her vises oppsettet og loggen', { exact: false })).toBeVisible();
  await axe(page);
});

test('DPS: the tour shows Kalibrering as a layout, with no figure and no return reason', async ({ page }) => {
  await startTour(page, 'DPS-kliniker');
  const kal = await held(page, 'Delt oversikt: Kalibrering');
  await expect(kal.win).toContainText('Ved spørsmål om ADHD hos voksne');
  expect(kal.text).not.toContain('1 182');
});

test('English: the held line and the tour text say the same', async ({ page }) => {
  await startTour(page, 'Fastlege');
  await page.getByRole('button', { name: 'English' }).click();
  const win = page.locator('[data-tour-frame]');
  for (let i = 0; i < 30; i++) {
    if ((await win.getAttribute('aria-label')) === 'Live example: My referral pattern') break;
    await page.getByRole('button', { name: /^(Next|Next part)$/ }).click();
  }
  await expect(win.locator('[data-held]')).toHaveText('No figures in the tour. The figures show once the three cases are done.');
  await expect(page.getByText('Only the layout shows here: the figures, which are fictional, show once the three cases are done.', { exact: false })).toBeVisible();
});
