import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { configWithoutForms } from './mock';
import { openCurrentCase, panel, place } from './helpers';

// ATLAS 3.6, the form pass, in the app's own preview forms (built from the same instrument as the Nettskjema forms): the
// decision without ATLAS comes before B1 and again with ATLAS before B2, in each role's and case's words, with «Ikke
// bestemt» as a choice; Kari's form follows the role; S2 asks C1-06, offers «Vet ikke» on C3-01 and requires C4-02 and
// C-CUCF-02. The preview flag keeps every answer in the browser, so no check reaches Nettskjema.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

type Role = 'fastlege' | 'dps-kliniker';
type Case = 'kari' | 'erlend' | 'astrid';
const ORDER: Case[] = ['kari', 'erlend', 'astrid'];
const STEP: Record<Case, string> = { kari: 'S3', erlend: 'S4', astrid: 'S5' };

/** The decision item as each role meets it, by case: the question and its choices. */
const DECISION: Record<Role, Record<Case, { q: RegExp; options: string[] }>> = {
  fastlege: {
    kari: { q: /^Hva ville du gjort nå\?/, options: ['Beholde pasienten i allmennpraksis', 'Henvise til DPS', 'Ikke bestemt'] },
    erlend: { q: /^Hva ville du gjort nå\?/, options: ['Beholde pasienten i allmennpraksis', 'Henvise til DPS', 'Ikke bestemt'] },
    astrid: { q: /^Hva er planen videre\?/, options: ['Følge opp i allmennpraksis', 'Henvise på nytt', 'Ikke bestemt'] },
  },
  'dps-kliniker': {
    kari: { q: /^Hvordan ville du vurdert henvisningen\?/, options: ['Be om mer informasjon', 'Rett til helsehjelp', 'Retur med råd', 'Ikke bestemt'] },
    erlend: { q: /^Hvordan ville du vurdert henvisningen\?/, options: ['Be om mer informasjon', 'Rett til helsehjelp', 'Retur med råd', 'Ikke bestemt'] },
    astrid: { q: /^Hva ville du svart fastlegen\?/, options: ['Stå ved returen', 'Åpne for en ny vurdering', 'Ikke svare nå', 'Ikke bestemt'] },
  },
};

/** A participant's stored progress at a case (the tour done, the cases before it done), with the preview flag on. */
async function seed(page: Page, role: Role, at: Case | 'end') {
  const done = at === 'end' ? ORDER : ORDER.slice(0, ORDER.indexOf(at));
  const sent = (steg: string) => ({ status: 'sent', at: '2026-10-20T00:00:00.000Z', steg, via: 'panel' });
  const ledger: Record<string, object> = { S1: sent('S1') };
  for (const c of done) ledger[STEP[c]] = sent(`${STEP[c]}-etter`);
  const state = {
    v: 2,
    roleChoice: role,
    intervju: 'Nei',
    studienavn: 'Ivrig ugle 42',
    furthest: at === 'end' ? 'helhet' : at,
    route: 'panel',
    ledger,
    visAtlas: Object.fromEntries(done.map((c) => [c, true])),
    page1: {},
    phase: Object.fromEntries(done.map((c) => [c, 'done'])),
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: true, started: true },
    extra: {},
    prompts: Object.fromEntries(done.map((c) => [c, 'later'])),
    feedbackSent: [],
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('atlas.preview', 'true');
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

const previewForm = (page: Page) => panel(page).locator('form');

/** The questions on the preview form's page, in order: each radio group's or text box's accessible name. */
async function questionNames(form: Locator): Promise<string[]> {
  return form.locator('[role="radiogroup"], textarea, input[type="text"], input[type="checkbox"]').evaluateAll((els) =>
    els.map((el) => {
      const by = el.getAttribute('aria-labelledby');
      const fromIds = by ? by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ') : '';
      const own = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent ?? '' : '';
      return (fromIds || own).replace(/\s+/g, ' ').trim();
    }),
  );
}

async function toCasePage1(page: Page, role: Role, c: Case) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await seed(page, role, c);
  await page.goto('/#/studie/hjem');
  await openCurrentCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(previewForm(page).getByRole('heading', { level: 2 })).toContainText('Side 1 av 3');
}

async function answerDecision(form: Locator, role: Role, c: Case, choice: number) {
  const group = form.getByRole('radiogroup').first();
  await expect(group).toHaveAccessibleName(DECISION[role][c].q);
  await group.getByRole('radio', { name: DECISION[role][c].options[choice], exact: true }).check({ force: true });
}

for (const role of ['fastlege', 'dps-kliniker'] as const) {
  for (const c of ORDER) {
    test(`${role}, ${c}: page 1 asks the decision, then how sure, and both are required`, async ({ page }) => {
      await toCasePage1(page, role, c);
      const form = previewForm(page);
      const names = await questionNames(form);
      expect(names).toHaveLength(2);
      expect(names[0]).toMatch(DECISION[role][c].q);
      expect(names[1]).toMatch(/^Hvor sikker er du på /);
      for (const n of names) expect(n).not.toContain('(valgfritt)');
      const group = form.getByRole('radiogroup').first();
      await expect(group.getByRole('radio')).toHaveCount(DECISION[role][c].options.length);
      for (const o of DECISION[role][c].options) await expect(group.getByRole('radio', { name: o, exact: true })).toBeVisible();
      // Nothing is chosen at the start, and «Neste» stops at the decision until it is answered.
      for (const r of await group.getByRole('radio').all()) await expect(r).not.toBeChecked();
      await form.getByRole('button', { name: 'Neste', exact: true }).click();
      await expect(form.getByText('Svar på spørsmålet før du går videre.')).toBeVisible();
      await expect(form.getByRole('heading', { level: 2 })).toContainText('Side 1 av 3');
      await answerDecision(form, role, c, DECISION[role][c].options.length - 1);
      await form.getByRole('button', { name: 'Neste', exact: true }).click();
      // B1 is still unanswered: the form stays on page 1.
      await expect(form.getByRole('heading', { level: 2 })).toContainText('Side 1 av 3');
      await form.getByRole('radiogroup').nth(1).getByRole('radio', { name: '4', exact: true }).check({ force: true });
      await form.getByRole('button', { name: 'Neste', exact: true }).click();
      await expect(form.getByRole('heading', { level: 2 })).toContainText('Side 2 av 3');
      const axe = await new AxeBuilder({ page }).include('[data-form-panel]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(axe.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
}

test('a GP in Kari\'s case: the last page asks the check item, then the decision again, then B2', async ({ page }) => {
  await toCasePage1(page, 'fastlege', 'kari');
  const form = previewForm(page);
  await answerDecision(form, 'fastlege', 'kari', 0);
  await form.getByRole('radiogroup').nth(1).getByRole('radio', { name: '3', exact: true }).check({ force: true });
  await form.getByRole('button', { name: 'Neste', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await place(page, 3);
  await page.getByLabel('Henvis', { exact: true }).filter({ visible: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(panel(page).getByText('Gå videre i skjemaet og svar på resten nå.')).toBeVisible();
  await form.getByRole('button', { name: 'Neste', exact: true }).click();
  await expect(form.getByRole('heading', { level: 2 })).toContainText('Side 3 av 3');
  const names = await questionNames(form);
  expect(names[0]).toMatch(/^Har du arbeidet med denne saken i ATLAS/);
  expect(names[1]).toMatch(DECISION.fastlege.kari.q);
  expect(names[2]).toMatch(/^Hvor sikker er du på din beslutning med ATLAS\?/);
  // The decision with ATLAS starts empty: page 1's answer is not carried over.
  for (const r of await form.getByRole('radiogroup').nth(1).getByRole('radio').all()) await expect(r).not.toBeChecked();
});

test('DPS in Kari\'s case: DPS\'s own form, with the app\'s three outcomes, before B1 and before B2', async ({ page }) => {
  await toCasePage1(page, 'dps-kliniker', 'kari');
  const form = previewForm(page);
  await answerDecision(form, 'dps-kliniker', 'kari', 1);
  await form.getByRole('radiogroup').nth(1).getByRole('radio', { name: '5', exact: true }).check({ force: true });
  await form.getByRole('button', { name: 'Neste', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await place(page, 2);
  // The form's choices carry the app's words, so the app's own control is the visible one.
  await page.getByLabel('Rett til helsehjelp', { exact: true }).filter({ visible: true }).check({ force: true });
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await expect(panel(page).getByText('Gå videre i skjemaet og svar på resten nå.')).toBeVisible();
  await form.getByRole('button', { name: 'Neste', exact: true }).click();
  await expect(form.getByRole('heading', { level: 2 })).toContainText('Side 3 av 3');
  const names = await questionNames(form);
  expect(names.slice(0, 3).map((n) => n.slice(0, 40))).toEqual([
    expect.stringMatching(/^Har du arbeidet med denne saken i ATLAS/),
    expect.stringMatching(DECISION['dps-kliniker'].kari.q),
    expect.stringMatching(/^Hvor sikker er du på din beslutning med/),
  ]);
});

for (const role of ['fastlege', 'dps-kliniker'] as const) {
  test(`${role}: Helhetsinntrykk asks C1-06 before C1's reason, offers «Vet ikke» on C3-01 and requires C4-02 and C-CUCF-02`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await seed(page, role, 'end');
    await page.goto('/#/studie/hjem');
    await page.locator('[data-start-hero]').getByRole('button', { name: 'Gå til avslutningen' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Helhetsinntrykk' })).toBeVisible();
    const form = page.locator('[data-form-panel] form');
    const names = await questionNames(form);
    const at = (re: RegExp) => names.findIndex((n) => re.test(n));
    const c106 = at(/^Det var tydelig for meg når jeg kunne støtte meg på det ATLAS viste/);
    expect(c106).toBeGreaterThan(0);
    expect(names[c106 - 1]).toMatch(role === 'fastlege' ? /^Oversikten over mine tidligere henvisningsmønstre/ : /^Oversikten over henvisningsmønstrene i opptaksområdet/);
    expect(names[c106 + 1]).toMatch(/^Forklar vurderingen din \(1-3 setninger\)\. Hva fungerer\?/);
    expect(names[c106]).toContain('(valgfritt)');
    // Every written reason is required now.
    const reasons = names.filter((n) => /^(Forklar vurderingen din|Hvordan vurderer du evnen|Ser du noen risiko|Hva ville denne)/.test(n));
    expect(reasons).toHaveLength(6);
    for (const r of reasons) expect(r).not.toContain('(valgfritt)');
    expect(names[at(/^Hvordan vurderer du evnen ATLAS/)]).toContain('skriv «Vet ikke».');
    // C3-01: the seven points, then «Vet ikke».
    const c301 = form.getByRole('radiogroup', { name: /^ATLAS ivaretar behovene til både fastleger og spesialister/ });
    await expect(c301.getByRole('radio')).toHaveCount(8);
    await expect(c301.getByRole('radio').last()).toHaveAccessibleName('Vet ikke');
    await c301.getByRole('radio', { name: 'Vet ikke' }).check({ force: true });
    await expect(c301.getByRole('radio', { name: 'Vet ikke' })).toBeChecked();
    if (role === 'dps-kliniker') {
      expect(names[at(/^ATLAS gir meg informasjon/)]).toMatch(/vurderinger av henvisninger over tid/);
      expect(names[at(/^Hva ville denne/)]).toMatch(/^Hva ville denne oversikten bety for hvordan du vurderer henvisninger over tid\?/);
    }
    const axe = await new AxeBuilder({ page }).include('[data-form-panel]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    // In English, «Vet ikke» reads "Don't know".
    await page.getByRole('button', { name: 'English' }).click();
    await expect(form.getByRole('radiogroup', { name: /^ATLAS serves the needs of both GPs and specialists/ }).getByRole('radio').last()).toHaveAccessibleName("Don't know");
  });
}
