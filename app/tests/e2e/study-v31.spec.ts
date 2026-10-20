import { expect, test, type Page } from '@playwright/test';
import { configWithoutForms, mockNettskjema, recordSubmissions, submissions } from './mock';
import {
  HOME_HEADING,
  caseOnlyThenAtlas,
  clickThroughTour,
  doTour,
  frame,
  frameSteg,
  openCurrentCase,
  panel,
  place,
  sendForm,
  startStudy,
  toFirstCase,
  toHome,
} from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/** The open form's address, as the iframe carries it. */
async function frameParams(page: Page): Promise<URLSearchParams> {
  const src = await page.locator('iframe[data-form-frame]').getAttribute('src');
  return new URL(src ?? 'about:blank').searchParams;
}

/** How far the page scrolls down and sideways. Pages may scroll down (ATLAS 3.2); sideways is always 0. */
async function overflow(page: Page): Promise<[number, number]> {
  await page.waitForTimeout(250);
  return page.evaluate(() => [
    document.documentElement.scrollHeight - document.documentElement.clientHeight,
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  ]);
}

/** Kari, as the GP, from her briefing to the summary page (the form sent, the reply left unanswered). */
async function gpKariToSummary(page: Page) {
  await caseOnlyThenAtlas(page);
  await place(page, 3);
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(panel(page)).toBeVisible();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
}

test('after Om deg: the start page, where the cases wait for the tour and the tour starts from its greeting', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await expect(page.locator('[data-open-case], [data-to-list]')).toHaveCount(0);
  await expect(page.locator('[data-start-hero]')).toContainText('Sakene åpner seg etter omvisningen.');
  // The list says it too, on the case: «Etter omvisningen».
  await page.goto('/#/studie/liste');
  await expect(page.locator('[data-list-case="kari"]').getByText('Etter omvisningen')).toBeVisible();
  await expect(page.locator('[data-study-card] [data-open-case]')).toHaveCount(0);
  await page.goto('/#/studie/hjem');

  // The card says what the tour is before it starts; «Ikke nå» leaves the overview as it was.
  await page.locator('[data-start-tour]').click();
  const card = page.getByRole('dialog');
  await expect(card.getByRole('heading', { name: 'Før du starter: en kort omvisning' })).toBeVisible();
  await expect(card.locator('details')).toHaveCount(4);
  await card.getByRole('button', { name: 'Ikke nå' }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeVisible();

  // The tour's own address opens the card, never the tour: the participant reads what it is first.
  await page.goto('/#/studie/omvisning');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Før du starter: en kort omvisning' })).toBeVisible();
  await expect(page).toHaveURL(/#\/studie\/hjem$/);
  await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
  // The participant's tour starts with the study itself (decision 2).
  await expect(page.getByText('Slik foregår studien').first()).toBeVisible();
  await clickThroughTour(page);
  await expect(page.locator('[data-tour-prompt]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sakene er åpne nå' })).toBeVisible();
  await page.getByRole('button', { name: 'Til oversikten' }).click();
  await expect(page.locator('[data-start-hero] [data-to-list]')).toBeVisible();

  // Seen again from Hjelp, the tour asks nothing and changes nothing.
  await page.goto('/#/studie/omvisning?igjen');
  await clickThroughTour(page);
  await expect(page.locator('[data-tour-end="replay"]')).toBeVisible();
  await expect(page.locator('[data-tour-prompt]')).toHaveCount(0);
});

test('S9 from the overview opens in the panel with the role, the study name, the screen and the part locked, and no step', async ({ page }) => {
  await mockNettskjema(page);
  await recordSubmissions(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  const name = (await page.locator('[data-studienavn-value]').first().textContent())?.trim() ?? '';
  expect(name).toMatch(/^\S+ \S+ \d+$/);

  await page.locator('[data-feedback-tab]').click();
  await expect(page.getByText('Hvilken del gjelder tilbakemeldingen?')).toBeVisible();
  await page.locator('[data-feedback-part="timeliste"]').click();
  await expect(panel(page)).toBeVisible();
  const q = await frameParams(page);
  expect(new URL((await page.locator('iframe[data-form-frame]').getAttribute('src'))!).pathname).toBe('/a/S9');
  expect(q.get('CBrolle')).toBe('Fastlege');
  expect(q.get('CBstudienavn')).toBe(name);
  expect(q.get('CBside')).toBe('fastlege/hjem');
  expect(q.get('CBseksjon')).toBe('timeliste');
  expect(q.get('CBversjon')).toMatch(/^3\.5\.2-/);
  expect(q.get('LCKside')).toBe('true');
  expect(q.get('CBsteg')).toBeNull();
  expect(q.get('CBintervju')).toBeNull();

  await sendForm(page);
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toBeVisible();
  await expect(panel(page)).toBeHidden();
  const sent = await submissions(page);
  expect(sent.map((s) => s.key)).toEqual(['S1', 'S9']);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas.study.v2') ?? '{}'));
  expect(stored.feedbackSent).toEqual(['fastlege/hjem#timeliste']);
  // The step the participant is on is not touched: S9 is no step.
  expect(Object.keys(stored.ledger)).toEqual(['S1']);
});

test('S9 never replaces an open step form: during a case it opens in a new tab, and its receipt marks no step', async ({ page, context }) => {
  await mockNettskjema(context);
  await toFirstCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(frame(page).locator('#page')).toHaveText('Side 1 av 3');
  expect(await frameSteg(page)).toBe('S3');

  await page.locator('[data-feedback-tab]').click();
  const [tab] = await Promise.all([context.waitForEvent('page'), page.locator('[data-feedback-part]').first().click()]);
  await tab.waitForLoadState();
  const url = new URL(tab.url());
  expect(url.pathname).toBe('/a/S9');
  expect(url.searchParams.get('embed')).toBeNull();
  expect(url.searchParams.get('CBside')).toBe('fastlege/kari/konsultasjon');
  expect(url.searchParams.get('CBsteg')).toBeNull();
  await expect(page.getByText('Tilbakemeldingen åpnet seg i en ny fane, så skjemaet du er i, står urørt.')).toBeVisible();
  // The case form is where it was: page 1 of S3, in the panel.
  await expect(frame(page).locator('#page')).toHaveText('Side 1 av 3');
  expect(await frameSteg(page)).toBe('S3');

  // The feedback form's receipt names S9 (?skjema=S9): S3 is pending, and stays pending.
  await tab.locator('#send').click();
  await tab.locator('#receipt-link').click();
  await expect(tab.getByText('Takk. Tilbakemeldingen er sendt.')).toBeVisible();
  expect(new URL(tab.url()).searchParams.get('skjema')).toBe('S9');
  // No way into a second ATLAS from here: the tab offers to close.
  await expect(tab.getByRole('button', { name: 'Lukk fanen' })).toBeVisible();
  await expect(tab.getByRole('link', { name: 'Tilbake til ATLAS' })).toBeHidden();
  expect(await tab.evaluate(() => localStorage.getItem('atlas.study.sendt'))).toBeNull();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas.study.v2') ?? '{}'));
  expect(stored.ledger.S3).toBeUndefined();
  await expect(frame(page).locator('#page')).toHaveText('Side 1 av 3');
});

test('the end of a case asks once about its screens; from then on the tab is the way', async ({ page }) => {
  await mockNettskjema(page);
  await recordSubmissions(page);
  await toFirstCase(page);
  await gpKariToSummary(page);
  const prompt = page.locator('[data-case-prompt="kari"]');
  await expect(prompt).toContainText('Før du går videre til Erlend');
  await prompt.locator('[data-prompt-feedback]').click();
  await page.locator('[data-feedback-part="hele"]').click();
  await expect(panel(page)).toBeVisible();
  const q = await frameParams(page);
  expect(q.get('CBside')).toBe('fastlege/kari/saken');
  expect(q.get('CBseksjon')).toBe('hele');
  await sendForm(page);
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toBeVisible();
  await expect(page.locator('[data-case-prompt]')).toHaveCount(0);
  await expect(page.getByText('Du kan alltid gi tilbakemelding fra knappen ved høyre kant.')).toBeVisible();
  // After case 1 the day goes on from the list (3.4).
  await page.getByRole('button', { name: 'Til timelisten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Timeliste i dag' })).toBeVisible();
  // Back on Kari's summary later: the question is not asked again.
  await page.goto('/#/studie/sak/kari/oppsummering');
  await expect(page.getByRole('button', { name: 'Til timelisten' })).toBeVisible();
  await expect(page.locator('[data-case-prompt]')).toHaveCount(0);
  const sent = await submissions(page);
  expect(sent.map((s) => s.key)).toEqual(['S1', 'S3', 'S9']);
  expect(sent.find((s) => s.key === 'S9')?.fields.side).toBe('fastlege/kari/saken');
});

test('the study link opened again asks first; «Fortsett der du slapp» goes back into the case and its form', async ({ page, context }) => {
  await mockNettskjema(context);
  await toFirstCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(frame(page).locator('#page')).toHaveText('Side 1 av 3');
  // The same link in a new tab, as a participant (or the next one on a shared computer) would open it.
  const again = await context.newPage();
  await again.goto('/');
  await expect(again).toHaveURL(/#\/studie\/velkommen\?tilbake$/);
  await expect(again.locator('[data-welcome="back"]')).toContainText('Du var i sak 1, Kari Nordli.');
  // Nothing opens until the participant says it is them.
  await expect(again.locator('iframe[data-form-frame]')).toHaveCount(0);
  await again.getByRole('button', { name: 'Fortsett der du slapp' }).click();
  await expect(again).toHaveURL(/#\/studie\/sak\/kari\//);
  await expect(frame(again).locator('#page')).toHaveText('Side 1 av 3');
  expect(await frameSteg(again)).toBe('S3');
});

test('before S1 the study link opened again asks too, and «Ikke deg?» starts afresh with a new study name', async ({ page, context }) => {
  await mockNettskjema(context);
  await startStudy(page, 'Fastlege');
  const first = (await page.locator('[data-studienavn-value]').first().textContent())?.trim();
  const again = await context.newPage();
  await again.goto('/');
  await expect(again.locator('[data-welcome="back"]')).toContainText('Du hadde valgt rolle, men ikke sendt det første skjemaet.');
  await expect(again.locator('[data-welcome="back"]').getByText(first ?? '', { exact: true }).first()).toBeVisible();
  await again.locator('[data-new-participant]').click();
  await again.getByRole('dialog').getByRole('button', { name: 'Start som ny deltaker' }).click();
  await expect(again.locator('[data-welcome="first"]')).toBeVisible();
  await again.getByRole('button', { name: 'Start som fastlege' }).click();
  await expect(again.getByRole('heading', { level: 1, name: 'Om deg' })).toBeVisible();
  const second = (await again.locator('[data-studienavn-value]').first().textContent())?.trim();
  expect(second).toMatch(/^\S+ \S+ \d+$/);
  expect(second).not.toBe(first);
});

test('a pilot session asks first within the pilot, and is left behind once the site runs the study round', async ({ page, context }) => {
  await mockNettskjema(context, { round: 'pilot' });
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  // The same link again while the pilot runs: the welcome back, so the round is read before the session.
  const again = await context.newPage();
  await again.goto('/');
  await expect(again).toHaveURL(/#\/studie\/velkommen\?tilbake$/);
  await expect(again.locator('[data-welcome="back"]')).toBeVisible();
  await again.close();
  // The owner switches to the study round: the pilot's session is not carried into it.
  await mockNettskjema(context, { round: 'study' });
  const study = await context.newPage();
  await study.goto('/');
  await expect(study.locator('[data-welcome="first"]')).toBeVisible();
  await expect(study.getByRole('button', { name: 'Start som fastlege' })).toBeVisible();
  await expect(study.locator('header').getByText('Pilot', { exact: true })).toHaveCount(0);
  const stored = await study.evaluate(() => JSON.parse(localStorage.getItem('atlas.study.v2') ?? '{}'));
  expect(stored.round).toBe('study');
  expect(stored.ledger).toEqual({});
  expect(stored.roleChoice).toBeUndefined();
  await study.goto('/#/studie/hjem');
  await expect(study).toHaveURL(/#\/studie\/velkommen$/);
});

test('a reload after the case form is sent keeps the case under way; the next case stays shut', async ({ page }) => {
  await mockNettskjema(page);
  await toFirstCase(page);
  await caseOnlyThenAtlas(page);
  await place(page, 3);
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(panel(page)).toBeVisible();
  await sendForm(page);
  await page.reload();
  await page.goto('/#/studie/sak/erlend');
  await expect(page).toHaveURL(/#\/studie\/sak\/kari\//);
  await page.goto('/#/studie/liste');
  await expect(page.locator('[data-list-case="kari"]').getByText('Ferdig')).toHaveCount(0);
  await expect(page.locator('[data-list-case="erlend"] [data-list-open]')).toHaveCount(0);
  // The case under way goes on from the start page's sheen, and from the list's study card.
  await page.goto('/#/studie/hjem');
  await page.locator('[data-start-hero] [data-open-case]').click();
  await expect(page).toHaveURL(/#\/studie\/sak\/kari\//);
});

test('S9 without an address: a notice, no panel, and the question at the end of the tour stays', async ({ page }) => {
  await mockNettskjema(page, { missing: ['S9'] });
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await page.locator('[data-feedback-tab]').click();
  await page.locator('[data-feedback-part]').first().click();
  await expect(page.getByText('Skjemaet for tilbakemelding er ikke klart ennå.')).toBeVisible();
  await expect(page.locator('iframe[data-form-frame]')).toHaveCount(0);
  await expect(panel(page)).toBeHidden();
  await page.locator('[data-start-tour]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
  await clickThroughTour(page);
  await page.locator('[data-tour-feedback]').click();
  await expect(page.getByText('Skjemaet for tilbakemelding er ikke klart ennå.')).toBeVisible();
  await expect(page.locator('[data-tour-prompt]')).toBeVisible();
});

test('the pilot round: the «Pilot» chip, the line on Velkommen, the pilot forms and -pilot on every answer', async ({ page }) => {
  await mockNettskjema(page, { round: 'pilot' });
  await recordSubmissions(page);
  await page.goto('/');
  await expect(page.getByText('Pilotrunde: svarene merkes som pilot og holdes utenfor studiens data.')).toBeVisible();
  await expect(page.locator('header').getByText('Pilot', { exact: true })).toBeVisible();
  await startStudy(page, 'DPS-kliniker');
  expect(new URL((await page.locator('iframe[data-form-frame]').getAttribute('src'))!).pathname).toBe('/a/pilot-S1');
  expect((await frameParams(page)).get('CBversjon')).toMatch(/^3\.5\.2-.*-pilot$/);
  await sendForm(page);
  await toHome(page);
  await page.locator('[data-feedback-tab]').click();
  await page.locator('[data-feedback-part]').first().click();
  expect(new URL((await page.locator('iframe[data-form-frame]').getAttribute('src'))!).pathname).toBe('/a/pilot-S9');
  await sendForm(page);
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toBeVisible();
  const sent = await submissions(page);
  expect(sent.map((s) => s.key)).toEqual(['pilot-S1', 'pilot-S9']);
  for (const s of sent) expect(s.fields.versjon).toMatch(/-pilot$/);
});

test('after the study’s last day: Velkommen says the study has ended, and nothing starts', async ({ page }) => {
  await mockNettskjema(page, { opens: '2020-01-06', closes: '2020-02-28' });
  await page.goto('/');
  await expect(page.locator('[data-welcome="closed"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Studien er avsluttet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start som fastlege' })).toHaveCount(0);
  await page.goto('/#/studie/om-deg');
  await expect(page).toHaveURL(/#\/studie\/velkommen$/);
  await expect(page.locator('[data-feedback-tab]')).toHaveCount(0);
});

test('welcome back, and «Ikke deg?» starts a new participant without touching what was sent', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await doTour(page);
  const name = (await page.locator('[data-studienavn-value]').first().textContent())?.trim() ?? '';
  await page.goto('/#/studie/velkommen');
  await expect(page.locator('[data-welcome="back"]')).toBeVisible();
  await expect(page.getByText('Velkommen tilbake', { exact: true })).toBeVisible();
  await expect(page.locator('[data-welcome="back"]').getByText(name, { exact: true }).first()).toBeVisible();
  // «Fortsett der du slapp» goes back to the overview.
  await page.getByRole('button', { name: 'Fortsett der du slapp' }).click();
  await expect(page.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeVisible();

  await page.goto('/#/studie/velkommen');
  await page.locator('[data-new-participant]').click();
  const confirm = page.getByRole('dialog');
  await expect(confirm.getByRole('heading', { name: 'Start som ny deltaker?' })).toBeVisible();
  await confirm.getByRole('button', { name: 'Start som ny deltaker' }).click();
  await expect(page.locator('[data-welcome="first"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start som fastlege' })).toBeVisible();
  // This browser's session is gone: no role, no study name, nothing sent and nothing pending.
  const after = await page.evaluate(() => ({
    state: JSON.parse(localStorage.getItem('atlas.study.v2') ?? 'null'),
    pending: localStorage.getItem('atlas.study.pending'),
  }));
  expect(after.state?.ledger?.S1).toBeUndefined();
  expect(after.state?.studienavn).toBeUndefined();
  expect(after.state?.roleChoice).toBeUndefined();
  expect(after.pending).toBeNull();
});

for (const [width, height] of [
  [1280, 633],
  [1280, 600],
] as const) {
  for (const role of ['Fastlege', 'DPS-kliniker'] as const) {
    test(`at ${width}×${height}, ${role}: the study’s own pages never scroll sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await mockNettskjema(page);
      const seen: string[] = [];
      const check = async (where: string) => {
        const [, side] = await overflow(page);
        if (side > 0) seen.push(`${where}: ${side}px sideways`);
      };
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await check('velkommen');
      await startStudy(page, role);
      await check('om deg, S1 open');
      await sendForm(page);
      await expect(page.getByRole('button', { name: 'Til oversikten' })).toBeVisible();
      await check('om deg, S1 sent');
      await toHome(page);
      await check('overview before the tour');
      await page.locator('[data-start-tour]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await check('tour card');
      await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
      for (let i = 1; i <= 4; i++) {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await check(`tour, the study part ${i}`);
        await page.getByRole('button', { name: /^(Neste|Neste del)$/ }).click();
      }
      await clickThroughTour(page);
      await check('tour end');
      await page.getByRole('button', { name: 'Til oversikten' }).click();
      await expect(page.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeVisible();
      await check('overview after the tour');
      await page.goto('/#/studie/steg');
      await expect(page.getByRole('heading', { level: 1, name: 'Studien' })).toBeVisible();
      await check('studien');
      await page.goto('/#/studie/hjem');
      await openCurrentCase(page);
      await page.goto('/#/studie/velkommen');
      await expect(page.locator('[data-welcome="back"]')).toBeVisible();
      await check('velkommen, back');
      expect(seen, seen.join('\n')).toEqual([]);
    });
  }
}

// The start page measures its own width: beside an open feedback form it drops to fewer columns, so its parts keep
// room (ATLAS 3.2, 3.4; a sideways check cannot see a squeezed column).
for (const [width, role] of [
  [1280, 'Fastlege'],
  [1366, 'Fastlege'],
  [1280, 'DPS-kliniker'],
  [1366, 'DPS-kliniker'],
] as const) {
  test(`at ${width} px, ${role}: with S9 open beside the start page, its parts keep their room`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mockNettskjema(page);
    await startStudy(page, role);
    await sendForm(page);
    await toHome(page);
    // Two stacks where the page has the room of a laptop window (3.4); fewer columns beside the open form.
    await expect(page.locator('[data-columns="3"]')).toBeVisible();
    await page.locator('[data-feedback-tab]').click();
    await page.locator('[data-feedback-part]').first().click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveAttribute('data-inline', 'true');
    await expect(page.locator('[data-columns="3"]')).toHaveCount(0);
    const part = page.locator(role === 'Fastlege' ? '[data-home-part="dag"]' : '[data-home-part="inntak"]');
    const box = await part.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(440);
    if (role === 'Fastlege') await expect(part.locator('[data-day-item="kari"]')).toBeVisible();
    else {
      // Each referral's name has a line of its own width, never a letter per line.
      const narrowest = await part.locator('li').evaluateAll((rows) => Math.min(...rows.map((r) => r.getBoundingClientRect().width)));
      expect(narrowest).toBeGreaterThanOrEqual(300);
    }
    const [, side] = await overflow(page);
    expect(side).toBeLessThanOrEqual(0);
  });
}
