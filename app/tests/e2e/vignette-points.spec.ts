import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema, recordSubmissions, submissions } from './mock';
import { frame, frameSteg, panel, place, sendForm, toStopPage } from './helpers';

/**
 * S5 gate, per vignette and role: a reload, a closed panel, a reset, a skip
 * and a failed send at the points of a vignette, each checked for the `steg`
 * value the form carries. Each run starts from a seeded study state at the
 * vignette's briefing, so every vignette is reached the same way.
 */

type Role = 'gp' | 'dps';
type Vignette = 'kari' | 'erlend' | 'astrid';
const STEG: Record<Vignette, string> = { kari: 'S3', erlend: 'S4', astrid: 'S5' };
const FORM_KEY: Record<Role, Record<Vignette, string>> = {
  gp: { kari: 'S3', erlend: 'S4.fastlege', astrid: 'S5.fastlege' },
  dps: { kari: 'S3', erlend: 'S4.dps', astrid: 'S5.dps' },
};
const BEFORE: Record<Vignette, Vignette[]> = { kari: [], erlend: ['kari'], astrid: ['kari', 'erlend'] };

function seedState(role: Role, v: Vignette) {
  const sent = (steg: string) => ({ status: 'sent', at: '2026-10-12T10:00:00Z', steg, via: 'panel' });
  const ledger: Record<string, object> = { S1: sent('S1'), S2: sent('S2') };
  const visAtlas: Record<string, boolean> = {};
  const phase: Record<string, string> = {};
  for (const b of BEFORE[v]) {
    ledger[STEG[b]] = sent(`${STEG[b]}-etter`);
    visAtlas[b] = true;
    phase[b] = 'done';
  }
  return {
    v: 1,
    roleChoice: role === 'gp' ? 'fastlege' : 'dps-kliniker',
    intervju: 'Nei',
    furthest: v,
    route: 'panel',
    ledger,
    visAtlas,
    page1: {},
    phase,
    gp: {},
    dps: {},
    tour: { part: 4, step: 0, done: true },
    extra: {},
  };
}

async function seed(page: Page, role: Role, v: Vignette) {
  const state = seedState(role, v);
  await page.addInitScript((s) => {
    // Seed once: a reload must keep what the test did after the seed.
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v1', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

/** The participant's own work with ATLAS up to and including the own decision (Appendix A (3)). */
async function ownDecision(page: Page, role: Role, v: Vignette) {
  // Below 1024 px the ATLAS panel is an end overlay: open it first.
  const openPanel = page.getByRole('button', { name: 'Vis ATLAS-panelet' });
  const usesPanel = !(role === 'gp' && v !== 'kari') && !(role === 'dps' && v === 'astrid');
  if (usesPanel && (await openPanel.isVisible())) await openPanel.click();
  const visible = (l: ReturnType<Page['getByRole']>) => l.filter({ visible: true }).first();
  if (role === 'gp') {
    if (v === 'kari') {
      await place(page, 3);
      await page.getByLabel('Henvis', { exact: true }).filter({ visible: true }).first().check({ force: true });
      await visible(page.getByRole('button', { name: 'Lagre beslutning' })).click();
      await visible(page.getByRole('button', { name: 'Skriv henvisningen' })).click();
      await visible(page.getByRole('button', { name: 'Send henvisning' })).click();
    } else if (v === 'erlend') {
      await page.getByRole('button', { name: 'Lagre utkast' }).click();
    } else {
      await page.locator('[data-section="composer"] textarea').fill('Hva manglet i henvisningen?');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
    }
    return;
  }
  if (v === 'astrid') {
    await page.locator('[data-section="composer"] textarea').fill('Beskriv mønsteret over tid.');
    await page.getByRole('button', { name: 'Send svaret' }).click();
    return;
  }
  await place(page, 3);
  await page.getByLabel('Rett til helsehjelp').filter({ visible: true }).first().check({ force: true });
  await visible(page.getByRole('button', { name: 'Send vurderingen' })).click();
}

async function startCase(page: Page) {
  await page.goto('/#/studie');
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(page.getByText('Uten ATLAS', { exact: true }).first()).toBeVisible();
}

async function confirmAndShow(page: Page) {
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await expect(panel(page)).toBeHidden();
}

const CASES: [Role, Vignette][] = [
  ['gp', 'kari'],
  ['gp', 'erlend'],
  ['gp', 'astrid'],
  ['dps', 'kari'],
  ['dps', 'erlend'],
  ['dps', 'astrid'],
];

for (const [role, v] of CASES) {
  const steg = STEG[v];
  const name = `${role === 'gp' ? 'GP' : 'DPS'} ${v}`;

  test.describe(name, () => {
    test(`reloads: page 1 again as ${steg} before «Vis ATLAS», ${steg}-etter at the page-2 moment after it`, async ({ page }) => {
      await mockNettskjema(page);
      await seed(page, role, v);
      await startCase(page);
      expect(await frameSteg(page)).toBe(steg);
      await toStopPage(page);
      await page.reload();
      // Case-only state again: page 1, the same steg, the confirmation asked again.
      await expect(frame(page).locator('#page')).toHaveText('Side 1 av 3');
      expect(await frameSteg(page)).toBe(steg);
      await toStopPage(page);
      await confirmAndShow(page);
      await page.reload();
      await expect(page.locator('iframe[data-form-frame]')).toHaveCount(0);
      await ownDecision(page, role, v);
      await expect(panel(page)).toBeVisible();
      expect(await frameSteg(page)).toBe(`${steg}-etter`);
      await expect(panel(page).getByText('Skjemaet er åpnet på nytt. Svar på alle sidene nå.')).toBeVisible();
    });

    test(`a closed panel keeps the same form: ${steg} through to the last page`, async ({ page }) => {
      await page.setViewportSize({ width: 1000, height: 800 });
      await mockNettskjema(page);
      await recordSubmissions(page);
      await seed(page, role, v);
      await startCase(page);
      await toStopPage(page);
      await panel(page).getByRole('button', { name: 'Skjul skjemaet' }).click();
      await expect(panel(page)).toBeHidden();
      await page.getByRole('button', { name: 'Vis skjemaet' }).click();
      await expect(frame(page).locator('#page')).toHaveText('Side 2 av 3');
      await confirmAndShow(page);
      // Held between «Vis ATLAS» and the page-2 moment: no way to open it early.
      await expect(page.getByRole('button', { name: 'Vis skjemaet' })).toHaveCount(0);
      await ownDecision(page, role, v);
      await expect(panel(page).getByText('Gå videre i skjemaet og svar på resten nå.')).toBeVisible();
      await expect(frame(page).locator('#page')).toHaveText('Side 2 av 3');
      await sendForm(page);
      await expect(panel(page)).toBeHidden();
      const sent = await submissions(page);
      expect(sent.map((s) => [s.key, s.fields.steg])).toEqual([[FORM_KEY[role][v], steg]]);
    });

    test(`a reset after «Vis ATLAS» keeps the record: the form opens as ${steg}-etter`, async ({ page }) => {
      await mockNettskjema(page);
      await seed(page, role, v);
      await startCase(page);
      await toStopPage(page);
      await confirmAndShow(page);
      await page.getByRole('button', { name: 'Hjelp' }).click();
      await page.getByRole('menuitem', { name: 'Start ufullførte steg på nytt' }).click();
      await page.getByRole('button', { name: 'Ja, start på nytt' }).click();
      await expect(page).toHaveURL(new RegExp(`#/studie/sak/${v}/orientering$`));
      await page.getByRole('button', { name: 'Start saken' }).click();
      expect(await frameSteg(page)).toBe(`${steg}-etter`);
    });

    test(`a skip at the page-2 moment lets the case go on; «Svar likevel» opens ${steg}-etter`, async ({ page }) => {
      await mockNettskjema(page);
      await seed(page, role, v);
      await startCase(page);
      await toStopPage(page);
      await confirmAndShow(page);
      await ownDecision(page, role, v);
      await expect(panel(page)).toBeVisible();
      await panel(page).getByText('Hopp over skjemaet').click();
      await expect(panel(page)).toBeHidden();
      await expect(page.getByRole('button', { name: 'Fortsett' }).first()).toBeVisible();
      await page.goto('/#/studie/steg');
      await page.getByRole('button', { name: 'Svar likevel' }).first().click();
      await expect(panel(page)).toBeVisible();
      expect(await frameSteg(page)).toBe(`${steg}-etter`);
    });

    test(`a failed send offers a retry in the same form, and the retry is sent as ${steg}`, async ({ page }) => {
      await mockNettskjema(page, { failOnce: [FORM_KEY[role][v]] });
      await recordSubmissions(page);
      await seed(page, role, v);
      await startCase(page);
      await toStopPage(page);
      await confirmAndShow(page);
      await ownDecision(page, role, v);
      await sendForm(page);
      await expect(panel(page).getByText('Sendingen feilet. Prøv igjen i skjemaet, eller åpne det i en ny fane.')).toBeVisible();
      await frame(page).locator('#send').click();
      await expect(panel(page)).toBeHidden();
      const sent = await submissions(page);
      expect(sent.map((s) => [s.key, s.fields.steg])).toEqual([[FORM_KEY[role][v], steg]]);
    });
  });
}
