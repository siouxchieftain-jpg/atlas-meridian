import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { configWithoutForms } from './mock';
import { HOME_HEADING, openCurrentCase, panel, place, confirmPage1 } from './helpers';

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
    astrid: { q: /^Hva ville du svart fastlegen\?/, options: ['Stå ved returen slik den er', 'Be om en ny henvisning', 'Vurdere henvisningen på nytt', 'Ikke svare nå', 'Ikke bestemt'] },
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
  // The start page first: opening a case before it has drawn took the wrong way in (review S1).
  await expect(page.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeVisible();
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

/** The participant's own work with ATLAS in each case, up to the page-2 moment (the steps the journey tests take). */
const WORK: Record<Role, Record<Case, (page: Page) => Promise<void>>> = {
  fastlege: {
    kari: async (page) => {
      await place(page, 3);
      await page.getByLabel('Henvis', { exact: true }).filter({ visible: true }).check({ force: true });
      await page.getByRole('button', { name: 'Lagre beslutning' }).click();
      await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
      await page.getByRole('button', { name: 'Send henvisning' }).click();
    },
    erlend: async (page) => {
      await expect(page.getByRole('heading', { name: 'Ny henvisning', level: 1 })).toBeVisible();
      await page.getByRole('button', { name: 'Lagre utkast' }).click();
    },
    astrid: async (page) => {
      await expect(page.getByRole('heading', { name: 'Retur med råd fra DPS' })).toBeVisible();
      await page.locator('[data-section="composer"] textarea').fill('Hva manglet i henvisningen?');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
    },
  },
  'dps-kliniker': {
    kari: async (page) => {
      await place(page, 2);
      // The form's choices carry the app's words, so the app's own control is the visible one.
      await page.getByLabel('Rett til helsehjelp', { exact: true }).filter({ visible: true }).check({ force: true });
      await page.getByRole('button', { name: 'Send vurderingen' }).click();
    },
    erlend: async (page) => {
      await place(page, 5);
      await page.getByLabel('Rett til helsehjelp', { exact: true }).filter({ visible: true }).check({ force: true });
      await page.getByRole('button', { name: 'Send vurderingen' }).click();
    },
    astrid: async (page) => {
      await page.locator('[data-section="composer"] textarea').fill('Beskriv mønsteret over tid.');
      await page.getByRole('button', { name: 'Send svaret' }).click();
    },
  },
};

for (const role of ['fastlege', 'dps-kliniker'] as const) {
  for (const c of ORDER) {
    test(`${role}, ${c}: the last page asks the check item, then the decision again, empty, then B2`, async ({ page }) => {
      await toCasePage1(page, role, c);
      const form = previewForm(page);
      await answerDecision(form, role, c, 0);
      await form.getByRole('radiogroup').nth(1).getByRole('radio', { name: '3', exact: true }).check({ force: true });
      await form.getByRole('button', { name: 'Neste', exact: true }).click();
      await expect(form.getByRole('heading', { level: 2 })).toContainText('Side 2 av 3');
      await confirmPage1(page);
      await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
      await WORK[role][c](page);
      await expect(panel(page).getByText('Du har gjort saken ferdig. Trykk nå: «Neste side» nederst i skjemaet. Teksten «Stopp her» gjelder ikke lenger.')).toBeVisible();
      await form.getByRole('button', { name: 'Neste', exact: true }).click();
      await expect(form.getByRole('heading', { level: 2 })).toContainText('Side 3 av 3');
      const names = await questionNames(form);
      expect(names[0]).toMatch(/^Har du arbeidet med denne saken i ATLAS/);
      expect(names[1]).toMatch(DECISION[role][c].q);
      expect(names[2]).toMatch(/^Hvor sikker er du på .+ med ATLAS\?/);
      const again = form.getByRole('radiogroup').nth(1);
      await expect(again.getByRole('radio')).toHaveCount(DECISION[role][c].options.length);
      // The decision with ATLAS starts empty: page 1's answer is not carried over.
      for (const r of await again.getByRole('radio').all()) await expect(r).not.toBeChecked();
    });
  }
}

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
      expect(names[at(/^Svarene og spørsmålene fra fastlegene/)]).toContain('etter mine vurderinger');
      expect(names[at(/^Hva ville denne/)]).toMatch(/^Hva ville denne tilbakemeldingen bety for hvordan du vurderer henvisninger over tid\?/);
    }
    const axe = await new AxeBuilder({ page }).include('[data-form-panel]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    // In English, «Vet ikke» reads "Don't know".
    await page.getByRole('button', { name: 'English' }).click();
    await expect(form.getByRole('radiogroup', { name: /^ATLAS serves the needs of both GPs and specialists/ }).getByRole('radio').last()).toHaveAccessibleName("Don't know");
  });
}
