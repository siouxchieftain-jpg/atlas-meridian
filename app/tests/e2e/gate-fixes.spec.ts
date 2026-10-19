import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema, configWithoutForms } from './mock';
import { caseOnlyThenAtlas, finishCaseHome, openCurrentCase, panel, place, sendForm, startStudy, toFirstCase, toStopPage } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/**
 * Behaviour added in the S5 to S8 gate fix pass: each test names the finding
 * it covers, so the re-review can see the check behind each fix.
 */

async function toKari(page: Page, role: 'Fastlege' | 'DPS-kliniker' = 'Fastlege') {
  await toFirstCase(page, role);
}

/** Move within the app without a reload, as the in-app links do. */
async function go(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
}

test('AX-01: at 1366 px the case form at the page-2 moment sits beside the ATLAS panel, not over it', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockNettskjema(page);
  await toKari(page);
  await caseOnlyThenAtlas(page);
  await place(page, 3);
  await page.getByLabel('Behold', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toHaveAttribute('data-inline', 'true');
  // Focus moved into the panel, to its heading.
  await expect(panel(page).getByRole('heading', { level: 2 })).toBeFocused();
  // The ATLAS panel is not covered: its decision block is fully in view beside the form.
  const atlas = await page.getByRole('complementary', { name: 'ATLAS' }).boundingBox();
  const form = await panel(page).boundingBox();
  expect(atlas && form && atlas.x + atlas.width <= form.x + 1).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('AX-01: below the inline width, Escape hides the form panel from anywhere on the page', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await mockNettskjema(page);
  await toKari(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toHaveAttribute('data-inline', 'false');
  await page.getByRole('heading', { level: 1 }).focus();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Vis skjemaet' })).toBeVisible();
});

test('G-15: resetting unfinished steps is confirmed on the page it leads to, without a toast', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.getByRole('button', { name: 'Hjelp' }).click();
  await page.getByRole('menuitem', { name: 'Start ufullførte steg på nytt' }).click();
  await page.getByRole('button', { name: 'Ja, start på nytt' }).click();
  // v3.1: the case starts again from the overview.
  await expect(page).toHaveURL(/#\/studie\/hjem$/);
  await expect(page.getByText('Ufullførte steg er startet på nytt.')).toBeVisible();
  await expect(page.locator('.fui-Toast')).toHaveCount(0);
  // Once the page has settled, the notice belongs to that page only.
  await page.waitForTimeout(600);
  await page.goto('/#/studie/steg');
  await expect(page.getByText('Ufullførte steg er startet på nytt.')).toHaveCount(0);
});

test('AX-03: a help dialog gives focus back to the Hjelp button when it closes', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByRole('button', { name: 'Hjelp' }).click();
  await page.getByRole('menuitem', { name: 'Om prototypen' }).click();
  const dialog = page.getByRole('dialog');
  // Review mode says what the prototype does not do (SV-11).
  await expect(dialog.getByText('Dette gjør ikke prototypen')).toBeVisible();
  // «Lukk» at the foot (3.3: the header's close button has the same name and does the same).
  await dialog.getByRole('button', { name: 'Lukk' }).last().click();
  await expect(page.getByRole('button', { name: 'Hjelp' })).toBeFocused();
  await page.getByRole('button', { name: 'Hjelp' }).click();
  await page.getByRole('menuitem', { name: 'Om prototypen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lukk' }).first().click();
  await expect(page.getByRole('button', { name: 'Hjelp' })).toBeFocused();
});

test('SV-10: the review landing says what to look for', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  const look = page.getByRole('region', { name: 'Se særlig etter' });
  await expect(look.getByRole('listitem')).toHaveCount(5);
  await expect(look.getByText(/Hvor opplysningene kommer fra/)).toBeVisible();
});

test('SV-19: «Se fra den andre siden» keeps the moment: the thread to the thread, the summary to the summary', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByRole('button', { name: 'Se fra den andre siden' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang\/dps\/sak\/kari\/dialog$/);
  await go(page, '#/gjennomgang/dps/sak/kari/oppsummering');
  await page.getByRole('button', { name: 'Se fra den andre siden' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang\/fastlege\/sak\/kari\/oppsummering$/);
  // The header role switch does the same.
  await page.getByRole('group', { name: 'Rolle', exact: true }).getByRole('button', { name: 'DPS, inntak' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang\/dps\/sak\/kari\/oppsummering$/);
});

test('SV-19: each side’s tour starts at its own first step', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/omvisning');
  const first = await page.getByRole('heading', { level: 1 }).textContent();
  await page.getByRole('button', { name: 'Neste' }).click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(first ?? '');
  await go(page, '#/gjennomgang/dps/omvisning');
  await expect(page.getByText(/punkt 1 av/).first()).toBeVisible();
});

test('SV-08: without form addresses the review overview says so and offers the answers as CSV', async ({ page }) => {
  await mockNettskjema(page, { missing: ['R1', 'R2'] });
  await page.goto('/#/gjennomgang/tilbakemeldinger');
  await expect(page.getByText(/Tilbakemeldingsskjemaene vises som forhåndsvisning/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Last ned svarene som CSV' }).click();
  expect((await download).suggestedFilename()).toBe('atlas-gjennomgang.csv');
});

test('MF-05: below 1024 px the DPS queue keeps the received date, the sender and the deadline', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/#/gjennomgang/dps/mottatte');
  const row = page.getByRole('link', { name: /Kari Nordli/ });
  await expect(row.getByText('Vurderingsfrist')).toBeVisible();
  await expect(row.getByText('31. mars 2026')).toBeVisible();
  await expect(row.getByText('Mottatt')).toBeVisible();
});

test('MF-03: the compact band names every marker it draws', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByRole('button', { name: 'Vis ATLAS-panelet' }).click();
  await place(page, 3);
  await page.keyboard.press('Escape');
  const compact = page.locator('[data-band]').filter({ visible: true }).first();
  await expect(compact).toContainText('Henvisende fastlege plasserte saken');
  await expect(compact).toContainText('Systemets lesning');
});

/** A GP study state at Astrid's briefing, Kari and Erlend done (as in vignette-points.spec.ts). */
async function seedGpAtAstrid(page: Page) {
  const sent = (steg: string) => ({ status: 'sent', at: '2026-10-12T10:00:00Z', steg, via: 'panel' });
  const state = {
    v: 2,
    roleChoice: 'fastlege',
    intervju: 'Nei',
    furthest: 'astrid',
    route: 'panel',
    ledger: { S1: sent('S1'), S3: sent('S3-etter'), S4: sent('S4-etter') },
    visAtlas: { kari: true, erlend: true },
    page1: {},
    phase: { kari: 'done', erlend: 'done' },
    gp: {},
    dps: {},
    tour: { part: 4, step: 0, done: true },
    extra: {},
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

test('R2GP-01: Astrid «Henvis på nytt» then «Send henvisning» leads on to the summary and Avslutning', async ({ page }) => {
  await mockNettskjema(page);
  await seedGpAtAstrid(page);
  await page.goto('/#/studie/hjem');
  await openCurrentCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await toStopPage(page);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await page.locator('[data-section="composer"] textarea').fill('Hva skal til for at DPS vurderer henne på nytt?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await page.getByLabel('Henvis på nytt').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click();
  await page.getByRole('button', { name: 'Skriv den nye henvisningen' }).click();
  // The new draft says what «Lagre utkast» means too (R2GP-07).
  await expect(page.getByText(/betyr at den nye henvisningen ikke sendes nå/)).toBeVisible();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(page).toHaveURL(/#\/studie\/sak\/astrid\/sendt$/);
  // The sent page names only what went with the new referral (R2GP-04).
  await expect(page.getByText('Den nye henvisningen er sendt. Saken slutter her i studien, uten svar fra DPS.')).toBeVisible();
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await expect(page).toHaveURL(/#\/studie\/sak\/astrid\/oppsummering$/);
  await expect(page.getByText(/henvis på nytt/i).first()).toBeVisible();
  // After case 3 the start page, where the closing part waits (3.4).
  await finishCaseHome(page);
  await expect(page.locator('[data-start-hero]').getByRole('button', { name: 'Gå til avslutningen' })).toBeVisible();
  // Back in the dialogue the plan stays as it was, with the way on to the summary.
  await page.goto('/#/studie/sak/astrid/dialog');
  await expect(page.getByText('Planen kan ikke endres etter at den nye henvisningen er skrevet.').or(page.getByText(/Planen er lagret og kan ikke endres/))).toBeVisible();
});

/** Review tour: go forward until the step with this heading. */
async function tourTo(page: Page, role: 'fastlege' | 'dps', title: string) {
  await page.goto(`/#/gjennomgang/${role}/omvisning`);
  for (let i = 0; i < 20; i++) {
    if ((await page.getByRole('heading', { level: 1 }).textContent())?.trim() === title) return;
    await page.getByRole('button', { name: /^(Neste|Neste del)$/ }).click();
  }
  throw new Error(`tour step not found: ${title}`);
}

test('R2DPS-01: the structured return in the tour stays on screen after «Send vurderingen», with focus on it', async ({ page }) => {
  await tourTo(page, 'dps', 'Den strukturerte tilbakemeldingen');
  const frame = page.locator('[data-tour-frame]');
  await frame.getByLabel('Retur med råd').check({ force: true });
  await frame.getByLabel('Kommunalt tilbud ikke utprøvd').check({ force: true });
  await frame.getByRole('textbox', { name: /Råd til fastlegen/ }).fill('Prøv Rask psykisk helsehjelp først.');
  await frame.getByRole('button', { name: 'Send vurderingen' }).click();
  const sent = frame.locator('[data-sent-assessment]');
  await expect(sent).toBeVisible();
  await expect(sent).toBeFocused();
  await expect(sent).toContainText('Retur med råd');
});

test('R2A-02: after the final «Send vurderingen» in the dialogue, focus is on the message just sent', async ({ page }) => {
  // Review mode: DPS asks for more information, the GP side is the example reply, then the final choice.
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await place(page, 3);
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await page.goto('/#/gjennomgang/dps/sak/kari/dialog');
  await page.getByLabel('Rett til helsehjelp').check({ force: true });
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  const focused = page.locator('[data-message][data-own]').last();
  await expect(focused).toBeFocused();
});

test('R2A-01: the ATLAS drawer below 1024 px gives focus back to its button when closed with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  const open = page.getByRole('button', { name: 'Vis ATLAS-panelet' });
  await open.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(open).toBeFocused();
});

test('R2A-04: at 400 % zoom the header does not cover the form panel', async ({ page }) => {
  await mockNettskjema(page);
  await page.setViewportSize({ width: 320, height: 256 });
  await startStudy(page, 'Fastlege');
  const heading = panel(page).locator('h2').first();
  await expect(heading).toBeVisible();
  const box = await heading.boundingBox();
  const onTop = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-form-panel]') !== null, [box!.x + 4, box!.y + box!.height / 2]);
  expect(onTop).toBe(true);
});

test('R2V-02: the DPS Astrid case-only line asks how to answer the GP, not for an outcome', async ({ page }) => {
  await mockNettskjema(page);
  const sent = (steg: string) => ({ status: 'sent', at: '2026-10-12T10:00:00Z', steg, via: 'panel' });
  const state = {
    v: 2,
    roleChoice: 'dps-kliniker',
    intervju: 'Nei',
    furthest: 'astrid',
    route: 'panel',
    ledger: { S1: sent('S1'), S3: sent('S3-etter'), S4: sent('S4-etter') },
    visAtlas: { kari: true, erlend: true },
    page1: {},
    phase: { kari: 'done', erlend: 'done' },
    gp: {},
    dps: {},
    tour: { part: 3, step: 0, done: true },
    extra: {},
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
  await page.goto('/#/studie/hjem');
  await openCurrentCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(page.getByText(/Tenk gjennom hvordan du ville svart fastlegen/)).toBeVisible();
  await expect(page.getByText(/hvilket utfall du ville valgt/)).toHaveCount(0);
});

/* ---------- Round 3 fixes ---------- */

/** True when the centre of the element is not under the form panel (what a pointer or a sighted reader reaches). */
async function notUnderFormPanel(page: Page, selector: ReturnType<Page['locator']>) {
  await selector.scrollIntoViewIfNeeded();
  const box = await selector.boundingBox();
  expect(box, 'element has a box').not.toBeNull();
  return page.evaluate(([x, y]) => !document.elementFromPoint(x, y)?.closest('[data-form-panel]'), [box!.x + box!.width / 2, box!.y + box!.height / 2]);
}

test('R3A-01: at 1366 × 500 the form panel hides at «Vis ATLAS», so ATLAS can be worked', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.setViewportSize({ width: 1366, height: 500 });
  await caseOnlyThenAtlas(page);
  await expect(panel(page)).toBeHidden();
  const combo = page.getByRole('combobox', { name: 'Plasser saken' }).filter({ visible: true }).first();
  expect(await notUnderFormPanel(page, combo)).toBe(true);
  await place(page, 3);
  await expect(page.getByText(/^Systemets lesning:/).filter({ visible: true }).first()).toBeVisible();
});

test('R3A-01: at 320 × 256 «Skjul skjemaet» and «Vis ATLAS» both hide the form panel', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.setViewportSize({ width: 320, height: 256 });
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(panel(page)).toBeVisible();
  await panel(page).getByRole('button', { name: 'Skjul skjemaet' }).click();
  await expect(panel(page)).toBeHidden();
  const show = page.getByRole('button', { name: 'Vis skjemaet' });
  expect(await notUnderFormPanel(page, show)).toBe(true);
  await show.click();
  await expect(panel(page)).toBeVisible();
  await toStopPage(page);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await expect(panel(page)).toBeHidden();
  expect(await notUnderFormPanel(page, page.getByRole('button', { name: 'Vis ATLAS-panelet' }))).toBe(true);
});

test('R3A-02: a page chosen in the navigation drawer gets focus on its heading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/gjennomgang/fastlege/timeliste');
  await page.getByRole('button', { name: 'Meny' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Mitt henvisningsmønster' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('Mitt henvisningsmønster');
  await expect(h1).toBeFocused();
  await page.waitForTimeout(600);
  await expect(h1).toBeFocused();
});

test('R3A-03: at 400 % zoom the feedback popover stays inside the window', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  const inside = async () => {
    const box = await page.locator('.fui-PopoverSurface').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    expect(box!.y + box!.height).toBeLessThanOrEqual(256);
  };
  await inside();
  await page.getByRole('dialog').getByLabel('Ekstern fagperson').check({ force: true });
  const use = page.getByRole('button', { name: 'Bruk denne rollen' });
  await use.focus();
  await expect(use).toBeInViewport();
  await use.click();
  await inside();
  // The last part of the list can be reached and seen.
  const parts = page.locator('[data-feedback-part]');
  const last = parts.last();
  await last.focus();
  await expect(last).toBeInViewport();
});

/** A GP study state at Takk, every step done. */
async function seedGpAtTakk(page: Page) {
  const sent = (steg: string) => ({ status: 'sent', at: '2026-10-12T10:00:00Z', steg, via: 'panel' });
  const state = {
    v: 2,
    roleChoice: 'fastlege',
    intervju: 'Nei',
    furthest: 'takk',
    route: 'panel',
    ledger: { S1: sent('S1'), S2: sent('S2'), S3: sent('S3-etter'), S4: sent('S4-etter'), S5: sent('S5-etter'), S6: sent('S6'), S8: sent('S8') },
    visAtlas: { kari: true, erlend: true, astrid: true },
    page1: {},
    phase: { kari: 'done', erlend: 'done', astrid: 'done' },
    gp: {},
    dps: {},
    tour: { part: 4, step: 0, done: true },
    extra: {},
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

test('R3F-02: the Takk dialog gives focus back on cancel, and to the Velkommen heading after removing the data', async ({ page }) => {
  await mockNettskjema(page);
  await seedGpAtTakk(page);
  await page.goto('/#/studie/takk');
  const open = page.getByRole('button', { name: 'Fjern ATLAS-data fra denne nettleseren' });
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(open).toBeFocused();
  await open.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Avbryt' }).click();
  await expect(open).toBeFocused();
  await open.click();
  await page.getByRole('button', { name: 'Ja, fjern dataene' }).click();
  await page.waitForLoadState('load');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible();
  await expect(h1).toBeFocused();
  // The study starts again from nothing: the app writes only a fresh, empty state on load.
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('atlas.study.v2') ?? '{}'));
  expect(stored.furthest).toBe('velkommen');
  expect(stored.ledger).toEqual({});
  expect(stored.intervju).toBeUndefined();
  expect(stored.roleChoice).toBeUndefined();
});

test('R3F-03: the tour’s decision frame has no button that leads nowhere after «Henvis»', async ({ page }) => {
  await tourTo(page, 'fastlege', 'Din beslutning');
  const frame = page.locator('[data-tour-frame]');
  await frame.getByLabel('Henvis', { exact: true }).check({ force: true });
  await frame.getByRole('button', { name: 'Lagre beslutning' }).click();
  await expect(frame.getByText('Lagret: Henvis.')).toBeVisible();
  await expect(frame.getByRole('button', { name: /Skriv henvisningen/ })).toHaveCount(0);
});

test('R3F-04: the draft names only what goes with it from the ATLAS panel', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/henvisning');
  const block = page.locator('[data-section="fra-atlas"]');
  await expect(block).toContainText('Ingenting fra ATLAS-panelet følger med henvisningen, fordi feltene der er tomme.');
  await expect(block).not.toContainText('Plasseringen din, hva som er uklart og tryggheten din følger henvisningen.');
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'Diagnostisk', exact: true }).click();
  await page.goto('/#/gjennomgang/fastlege/sak/kari/henvisning');
  await expect(block).toContainText('Fra ATLAS-panelet følger beskrivelsen av hva som er uklart med henvisningen.');
});

test('R3F-07: in the DPS queue Astrid’s question shows its status and when the referral was assessed', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/mottatte');
  const row = page.getByRole('link', { name: /Astrid Holm/ });
  await expect(row.getByText('Vurdert 16. mars 2026')).toBeVisible();
  await expect(row.getByText('Ny melding')).toBeVisible();
  await page.goto('/#/gjennomgang/dps/sak/astrid/vurdering');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await page.goto('/#/gjennomgang/dps/mottatte');
  await expect(row.getByText('Ikke besvart')).toBeVisible();
  await expect(row.getByText('Ny melding')).toHaveCount(0);
});

/* ---------- Round 4 fixes ---------- */

test('r4A-01: at 1366 × 500 an inline form panel leaves the header controls clear', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.setViewportSize({ width: 1366, height: 500 });
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toHaveAttribute('data-inline', 'true');
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const name of ['Hjelp', 'Norsk', 'English']) {
    const control = page.getByRole('button', { name, exact: true }).first();
    const box = await control.boundingBox();
    const clear = await page.evaluate(([x, y]) => !document.elementFromPoint(x, y)?.closest('[data-form-panel]'), [box!.x + box!.width / 2, box!.y + box!.height / 2]);
    expect(clear, name).toBe(true);
  }
});

test('r4A-02: at 320 × 256 the page-2 moment opens the form at its top, with the heading in view', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.setViewportSize({ width: 320, height: 256 });
  await page.getByRole('button', { name: 'Start saken' }).click();
  await toStopPage(page);
  // Page 1's scroll would otherwise be kept.
  await panel(page).evaluate((el) => (el.scrollTop = el.scrollHeight));
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await page.getByRole('button', { name: 'Vis ATLAS-panelet' }).click();
  await place(page, 3);
  await page.getByRole('dialog').getByLabel('Behold', { exact: true }).check({ force: true });
  await page.getByRole('dialog').getByRole('button', { name: 'Lagre beslutning' }).click();
  const heading = panel(page).getByRole('heading', { level: 2 });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(panel(page).getByText('Gå videre i skjemaet og svar på resten nå.')).toBeInViewport();
});

test('r4A-03: at 400 % zoom the chosen role stays in view in the feedback popover', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  const first = page.getByRole('dialog').getByRole('radio').first();
  await first.focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
    await expect(page.getByRole('dialog').getByRole('radio', { checked: true })).toBeInViewport();
  }
  await expect(page.getByRole('dialog').getByRole('radio', { name: 'Ekstern fagperson' })).toBeChecked();
});

test('r4A-09: a confirmation dialog is described by its text', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByRole('button', { name: 'Start på nytt' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleDescription(/Arbeidet ditt i sakene blir fjernet/);
  await page.keyboard.press('Escape');
});

test('r4F-01, r4F-02: the guide counts each criterion in its own section, as the margins do', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/erlend/henvisning');
  const guide = page.locator('[data-guide="draft"]').filter({ visible: true }).first();
  await expect(guide).toContainText('4 av 5 kriterier omtalt');
  const funksjon = page.locator('[data-section="henvisning-funksjon"]');
  await expect(funksjon.locator('[data-status]')).toHaveText('Ikke funnet ennå');
  // Words that belong to another section do not count as function.
  const tidligere = page.locator('[data-section="henvisning-tidligere"] textarea');
  await tidligere.fill(`${await tidligere.inputValue()} Jobbet med eksponering i terapi. Depresjon i familien.`);
  await page.waitForTimeout(300);
  await expect(guide).toContainText('4 av 5 kriterier omtalt');
  // Function in a GP's own words.
  await funksjon.locator('textarea').fill('Går lite ut og holder seg inne. Kommer seg ikke opp om morgenen.');
  await expect(funksjon.locator('[data-status]')).toHaveText('Omtalt');
  await expect(guide).toContainText('5 av 5 kriterier omtalt');
});

test('r4F-03: in the tour, «Send henvisning» leaves focus on the line that says it was sent', async ({ page }) => {
  await tourTo(page, 'fastlege', 'Hva DPS ser etter');
  const frame = page.locator('[data-tour-frame]');
  await frame.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(frame.getByText(/^Henvisningen ble sendt/)).toBeFocused();
});

test('r4F-04: R1 offers only the parts Astrid’s new referral has', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Fastlege', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/sak/astrid/henvisning');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  const pop = page.getByRole('dialog');
  await expect(pop.getByRole('button', { name: 'Hele skjermbildet' })).toBeVisible();
  await expect(pop.getByRole('button', { name: 'Fra ATLAS-panelet' })).toHaveCount(0);
  await expect(pop.getByRole('button', { name: 'Usikkerhetsvisning' })).toHaveCount(0);
});

test('r4F-05: «Start på nytt» keeps the parts already given and the role they were sent with', async ({ page }) => {
  await mockNettskjema(page);
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/timeliste');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hele skjermbildet' }).click();
  await sendForm(page);
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toBeVisible();
  await page.getByRole('button', { name: 'Start på nytt' }).click();
  await page.getByRole('button', { name: 'Ja, start på nytt' }).click();
  await go(page, '#/gjennomgang/tilbakemeldinger');
  await expect(page.getByText('Rollen er sendt med tilbakemeldingene og kan ikke endres.')).toBeVisible();
  await expect(page.locator('code').filter({ hasText: 'fastlege/timeliste#hele' })).toBeVisible();
});

test('r4F-06, r4F-07: DPS Astrid shows when the referral was assessed, and a summary title that fits', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/astrid/vurdering');
  await expect(page.getByText('Vurdert 16. mars 2026')).toBeVisible();
  await expect(page.getByText(/^Frist /)).toHaveCount(0);
  await page.goto('/#/gjennomgang/dps/sak/astrid/oppsummering');
  // Not answered yet is pending, not left standing (r8F-02); «Ikke svar nå» leaves it standing.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Et spørsmål som venter på svar');
  await expect(page.getByText('DPS har ikke svart på spørsmålet ennå.')).toBeVisible();
  await page.goto('/#/gjennomgang/dps/sak/astrid/dialog');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await page.goto('/#/gjennomgang/dps/sak/astrid/oppsummering');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Et spørsmål som ble stående');
  await expect(page.getByText('DPS svarte ikke på spørsmålet.')).toBeVisible();
});

/* ---------- Round 5 fixes ---------- */

test('r5A-01: with R1 open beside the page, the «Gi tilbakemelding» tab sits beside the panel, not under it', async ({ page }) => {
  await mockNettskjema(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/monster');
  const tab = page.getByRole('button', { name: 'Gi tilbakemelding' });
  await tab.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hele skjermbildet' }).click();
  await expect(panel(page)).toHaveAttribute('data-inline', 'true');
  const box = await tab.boundingBox();
  const onTab = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('button')?.textContent?.includes('Gi tilbakemelding'), [box!.x + box!.width / 2, box!.y + box!.height / 2]);
  expect(onTab).toBe(true);
  await tab.focus();
  await expect(tab).toBeFocused();
});

test('r5A-02, r5A-03: at 320 × 256 focus is brought into view, and the form keeps its place when shown again', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.setViewportSize({ width: 320, height: 256 });
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(panel(page)).toBeVisible();
  // Scrolled into the form, the reader hides it with Escape (the close button is at the top).
  await panel(page).evaluate((el) => (el.scrollTop = 150));
  await panel(page).focus();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await page.getByRole('button', { name: 'Vis skjemaet' }).click();
  await expect(panel(page)).toBeVisible();
  await expect.poll(() => panel(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  // «Vis ATLAS»: the case page's heading takes focus, in view.
  await toStopPage(page);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeFocused();
  await expect(h1).toBeInViewport();
});

test('r5F-04: after «Ikke svar nå» focus stays in the dialogue', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/astrid/vurdering');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  // Focus goes to the line that replaced the composer.
  await expect(page.getByText('Ingen svar ble sendt til fastlegen.')).toBeFocused();
});

test('r5F-04: the GP’s summary says whether the GP replied to DPS, and whether DPS answered Astrid’s question', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  await expect(page.locator('dt:has-text("Svar til DPS") + dd')).toHaveText('Svarte ikke');
  await go(page, '#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.locator('[data-section="composer"] textarea').fill('Hva skal til for at DPS vurderer henne på nytt?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await go(page, '#/gjennomgang/fastlege/sak/astrid/oppsummering');
  // Nobody has played DPS's answer, so the row says it rests on an example reply (r6F-02).
  await expect(page.locator('dt:has-text("Svar fra DPS") + dd')).toHaveText('Svarte i tråden (eksempelsvar)');
});

test('r5F-05: Astrid’s new referral is dated after the last message in the thread', async ({ page }) => {
  await mockNettskjema(page);
  await seedGpAtAstrid(page);
  await page.goto('/#/studie/hjem');
  await openCurrentCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await toStopPage(page);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await page.locator('[data-section="composer"] textarea').fill('Hva skal til for at DPS vurderer henne på nytt?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  // The thread renders after the route change; read it once it is there.
  await expect(page.locator('[data-message]').first()).toBeVisible();
  const dates = await page.locator('[data-message]').evaluateAll((els) => els.map((e) => e.textContent ?? ''));
  await page.getByLabel('Henvis på nytt').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click();
  await page.getByRole('button', { name: 'Skriv den nye henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(page).toHaveURL(/#\/studie\/sak\/astrid\/sendt$/);
  // The DPS reply in the thread is dated 19 March; the new referral is not dated before it.
  expect(dates.join(' ')).toContain('19. mars 2026');
  await expect(page.getByText('Sendt 19. mars 2026')).toBeVisible();
});

test('r5F-06: a DPS summary without DPS’s own placement does not speak of three placements', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/kari/oppsummering');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Plasseringer og utfall');
});

test('r5A-04: a sent referral says «Ikke funnet», without «ennå»', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/erlend/henvisning');
  const funksjon = page.locator('[data-section="henvisning-funksjon"] [data-status]');
  await expect(funksjon).toHaveText('Ikke funnet ennå');
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/erlend/henvisning');
  await expect(funksjon).toHaveText('Ikke funnet');
});

/* ---------- Round 6 fixes ---------- */

test('r6F-01: Risikovurdering counts what the GP writes, but not a statement that risk was not assessed', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/henvisning');
  const guide = page.locator('[data-guide="draft"]').filter({ visible: true }).first();
  const risk = page.locator('[data-section="henvisning-risiko"]');
  await expect(guide).toContainText('4 av 5 kriterier omtalt');
  await expect(guide).toContainText('Guiden kan ta feil begge veier');
  await risk.locator('textarea').fill('Ikke gjort suicidalvurdering i dag.');
  await expect(risk.locator('[data-status]')).toHaveText('Ikke funnet ennå');
  await expect(guide).toContainText('4 av 5 kriterier omtalt');
  // Grave warning signs in the GP's own words.
  await risk.locator('textarea').fill('Har kjøpt tau og skrevet brev til familien. Ser ingen utvei.');
  await expect(risk.locator('[data-status]')).toHaveText('Omtalt');
  await expect(guide).toContainText('5 av 5 kriterier omtalt');
});

test('r6F-02: in review, DPS’s «Ikke svar nå» reaches the GP side, with no example answer', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.locator('[data-section="composer"] textarea').fill('Hva skal til for at DPS vurderer henne på nytt?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await go(page, '#/gjennomgang/dps/sak/astrid/vurdering');
  await expect(page.getByText('Hva skal til for at DPS vurderer henne på nytt?')).toBeVisible();
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await expect(page.getByText('Eksempelsvar')).toHaveCount(0);
  await go(page, '#/gjennomgang/fastlege/sak/astrid/oppsummering');
  await expect(page.locator('dt:has-text("Svar fra DPS") + dd')).toHaveText('Svarte ikke');
});

test('r6F-02: in review, the GP’s «Ikke spør nå» leaves DPS no example question to answer', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.getByRole('button', { name: 'Ikke spør nå' }).click();
  await go(page, '#/gjennomgang/dps/sak/astrid/vurdering');
  await expect(page.getByText('Fastlegen sendte ikke noe spørsmål om returen.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ikke svar nå' })).toHaveCount(0);
  await go(page, '#/gjennomgang/dps/sak/astrid/oppsummering');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('En retur uten spørsmål');
});

test('r6F-02: a question the GP plays after DPS skipped the example question is new to DPS', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/astrid/vurdering');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.locator('[data-section="composer"] textarea').fill('Hva manglet i henvisningen?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  // What DPS did with the example question goes only after a confirmation (r10F-08).
  await page.getByRole('dialog', { name: 'Fjerne DPS-svaret?' }).getByRole('button', { name: 'Fjern og fortsett' }).click();
  await go(page, '#/gjennomgang/dps/sak/astrid/vurdering');
  await expect(page.getByText('Hva manglet i henvisningen?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ikke svar nå' })).toBeVisible();
});

test('r6F-04: in review, a skip given to the example request does not answer the request DPS plays', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  // DPS plays its own request.
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  // The GP gets the played request to answer; the summary does not yet say the GP did not reply.
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await expect(page.getByText('Hvordan er søvnen nå?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ikke svar nå' })).toBeVisible();
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  await expect(page.locator('dt', { hasText: 'Svar til DPS' })).toHaveCount(0);
  // Not replying to this request reaches DPS, whose final choice is no longer «etter svaret fra fastlegen».
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await expect(page.getByText('Fastlegen svarte ikke på forespørselen.')).toBeVisible();
  await expect(page.getByText('Endelig vurdering', { exact: true })).toBeVisible();
  await expect(page.getByText('Endelig vurdering etter svaret fra fastlegen')).toHaveCount(0);
});

test('r6F-06, r6F-07: Astrid’s first referral is read as «du» sent it; one referral case is singular in English', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await expect(page.locator('[data-guide="sent"]').filter({ visible: true }).first()).toContainText('Slik guiden leste henvisningen da du sendte den.');
  await expect(page.getByText('Den første henvisningen ble sendt 2. mars 2026.').filter({ visible: true }).first()).toBeVisible();
  await page.goto('/#/gjennomgang/fastlege/omvisning');
  await page.getByRole('button', { name: 'English' }).click();
  const bar = page.locator('[data-tour-frame]');
  await expect(bar).toContainText('1 referral case');
  await expect(bar).not.toContainText('1 referral cases');
});

test('r6A-01: another part asks before the open R1 is replaced; the open part shows it again with its answers', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  const tab = page.getByRole('button', { name: 'Gi tilbakemelding' });
  await tab.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Journalen: notat, legemidler, historikk' }).click();
  const answer = panel(page).getByRole('textbox', { name: 'Hva fungerer her?' });
  await answer.fill('Halvferdig svar.');
  // Another part: ATLAS asks first, and «Avbryt» keeps the form and its answer.
  await tab.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Systemets lesning' }).click();
  const ask = page.getByRole('dialog', { name: 'Bytte skjema?' });
  await expect(ask).toBeVisible();
  await expect(ask.getByRole('button').first()).toHaveText('Åpne det nye skjemaet');
  await expect(ask.getByRole('button', { name: 'Avbryt' })).toBeFocused();
  await ask.getByRole('button', { name: 'Avbryt' }).click();
  await expect(answer).toHaveValue('Halvferdig svar.');
  await expect(tab).toBeFocused();
  // The open part is marked; choosing it shows the same form.
  await tab.click();
  const openPart = page.getByRole('dialog').getByRole('button', { name: /Journalen.*Åpent nå/ });
  await expect(openPart).toBeVisible();
  await openPart.click();
  await expect(answer).toHaveValue('Halvferdig svar.');
  // Confirming the switch opens the other part's form.
  await tab.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Systemets lesning' }).click();
  await page.getByRole('dialog', { name: 'Bytte skjema?' }).getByRole('button', { name: 'Åpne det nye skjemaet' }).click();
  await expect(panel(page)).toContainText('lesning');
  await expect(panel(page).getByRole('textbox', { name: 'Hva fungerer her?' })).toHaveValue('');
});

test('r6A-02, r6A-05: the feedback notice goes with the page it was shown on; the tab label stays on one line at 400 %', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/monster');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hele skjermbildet' }).click();
  await panel(page).getByRole('button', { name: /^Send/ }).last().click();
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toBeVisible();
  await go(page, '#/gjennomgang/fastlege/timeliste');
  await go(page, '#/gjennomgang/fastlege/monster');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 256 });
  const label = page.locator('[data-feedback-tab] span').last();
  const box = await label.boundingBox();
  // One vertical line: the label is about as wide as one line of text.
  expect(box!.width).toBeLessThan(24);
});

test('r6A-03: at 320 × 256 focus after hiding the form is fully in view and clear of «Vis skjemaet»', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page, 'DPS-kliniker');
  await page.setViewportSize({ width: 320, height: 256 });
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(panel(page)).toBeVisible();
  await panel(page).getByRole('button', { name: 'Skjul skjemaet' }).click();
  await expect(panel(page)).toBeHidden();
  const toggle = page.getByRole('button', { name: 'Vis skjemaet' });
  await expect(toggle).toBeVisible();
  const [focused, cover] = await Promise.all([
    page.evaluate(() => {
      const r = (document.activeElement as HTMLElement).getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    }),
    toggle.boundingBox(),
  ]);
  expect(focused.top).toBeGreaterThanOrEqual(0);
  expect(focused.bottom).toBeLessThanOrEqual(256);
  const overlaps = focused.left < cover!.x + cover!.width && focused.right > cover!.x && focused.top < cover!.y + cover!.height && focused.bottom > cover!.y;
  expect(overlaps).toBe(false);
});
