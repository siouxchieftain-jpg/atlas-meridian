import { expect, test, type Page } from '@playwright/test';
import { panel } from './helpers';
import { configWithoutForms } from './mock';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/**
 * Behaviour fixed after the round-8 gate review (r8F, r8A). Each test names the finding it covers; each one fails on
 * the round-8 build (index-Bl_Soq9T.js) and passes on this one.
 */

const SPACING = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';

/** Move within the app without a reload, as the in-app links do. */
async function go(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
}

/** Review mode: the GP side decides to refer Kari and opens the referral. */
async function gpWritesKari(page: Page) {
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
}

/** Review mode: the DPS side asks the GP a question about Kari. */
async function dpsAsksKari(page: Page) {
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
}

test('r8F-01: while the played GP side has not replied, DPS waits: no example reply, no final choice, no «Ny melding»', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await gpWritesKari(page);
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await dpsAsksKari(page);
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await expect(page.getByText('Fastlegen har ikke svart ennå. Svaret vises her når fastlegesiden har svart.')).toBeVisible();
  await expect(page.getByText('Eksempelsvar')).toHaveCount(0);
  await expect(page.locator('[data-section="endelig-vurdering"]')).toHaveCount(0);
  await go(page, '#/gjennomgang/dps/mottatte');
  await expect(page.getByRole('link', { name: /Kari Nordli/ }).getByText('Ny melding')).toHaveCount(0);
  // Once the GP side replies, the final choice is due.
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.locator('[data-section="composer"] textarea').fill('Søvnen er fortsatt dårlig.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await expect(page.getByText('Søvnen er fortsatt dårlig.')).toBeVisible();
  await expect(page.locator('[data-section="endelig-vurdering"]')).toBeVisible();
  await expect(page.getByText('Fastlegen har ikke svart ennå.', { exact: false })).toHaveCount(0);
});

test('r8F-01: a referral sent after DPS assessed the example one asks first, and then clears that assessment', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await dpsAsksKari(page);
  await gpWritesKari(page);
  const send = page.getByRole('button', { name: 'Send henvisning' });
  await send.click();
  const ask = page.getByRole('dialog', { name: 'Fjerne DPS-vurderingen?' });
  await expect(ask).toBeVisible();
  await expect(ask.getByRole('button', { name: 'Avbryt' })).toBeFocused();
  await ask.getByRole('button', { name: 'Avbryt' }).click();
  await expect(send).toBeFocused();
  // Cancelled: nothing was sent, and DPS's assessment stands.
  await go(page, '#/gjennomgang/dps/mottatte');
  await expect(page.getByRole('link', { name: /Kari Nordli/ }).getByText(/^Vurdert/)).toBeVisible();
  await go(page, '#/gjennomgang/fastlege/sak/kari/henvisning');
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await page.getByRole('dialog', { name: 'Fjerne DPS-vurderingen?' }).getByRole('button', { name: 'Fjern vurderingen og send' }).click();
  await expect(page).toHaveURL(/\/fastlege\/sak\/kari\/sendt$/);
  // DPS starts again on the referral the GP side sent.
  await go(page, '#/gjennomgang/dps/mottatte');
  const row = page.getByRole('link', { name: /Kari Nordli/ });
  await expect(row.getByText('Ny henvisning')).toBeVisible();
  await expect(row.getByText(/^Vurdert/)).toHaveCount(0);
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await expect(page.getByLabel('Be om mer informasjon')).not.toBeChecked();
  // The GP side, in turn, sees DPS as not played.
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  await expect(page.getByText('DPS-siden er ikke spilt ennå, så det som står om DPS her, er eksempelsvar.')).toBeVisible();
});

test('r8F-02: a question DPS has not answered yet is pending, not left standing', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/astrid/oppsummering');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Et spørsmål som venter på svar');
  await expect(page.locator('dt:has-text("Svar til fastlegen") + dd')).toHaveText('Ikke besvart ennå');
  await expect(page.getByText('DPS har ikke svart på spørsmålet ennå.')).toBeVisible();
  // «Ikke svar nå» is a choice: then the question was left standing.
  await go(page, '#/gjennomgang/dps/sak/astrid/dialog');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await go(page, '#/gjennomgang/dps/sak/astrid/oppsummering');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Et spørsmål som ble stående');
  await expect(page.locator('dt:has-text("Svar til fastlegen") + dd')).toHaveText('Svarte ikke');
});

test('r8F-03, r8F-06: the caption shows where a row rests on an example, and only there', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  // Nothing sent yet: the GP summary says so, and nothing in it rests on DPS.
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  await expect(page.locator('dt:has-text("DPS-vurdering") + dd')).toHaveText('Ingen henvisning sendt ennå');
  await expect(page.getByText(/er (?:eksempelsvar|eksempler)\.$/)).toHaveCount(0);
  // «Behold»: DPS reads the example referral, and its summary says so.
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Behold', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  await expect(page.getByText(/er (?:eksempelsvar|eksempler)\.$/)).toHaveCount(0);
  await go(page, '#/gjennomgang/dps/sak/kari/oppsummering');
  await expect(page.getByText('Fastlegesiden har ikke sendt henvisningen, så henvisningen og det som står om fastlegen her, er eksempler.')).toBeVisible();
  // Astrid after «Ikke spør nå»: the return is case history, not an example; the plan is the GP's.
  await go(page, '#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.getByRole('button', { name: 'Ikke spør nå' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/astrid/oppsummering');
  await expect(page.getByText(/er (?:eksempelsvar|eksempler)\.$/)).toHaveCount(0);
  await expect(page.locator('dt', { hasText: 'Fastlegens plan' })).toBeVisible();
  await expect(page.locator('dt', { hasText: 'Din plan' })).toHaveCount(0);
});

test('r8F-04: «i fare» with nothing else named is a finding; a pointer or an empty form’s words is not', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/erlend/henvisning');
  const risk = page.locator('[data-section="henvisning-risiko"]');
  for (const text of ['Ikke i fare.', 'Mener selv hun ikke er i fare, men har skrevet ned hvordan hun vil gjøre det.']) {
    await risk.locator('textarea').fill(text);
    await expect(risk.locator('[data-status]'), text).toHaveText('Omtalt');
  }
  for (const text of ['Står i journalen.', 'Skriv inn', 'Gjør risikovurdering når hun kommer til kontroll.']) {
    await risk.locator('textarea').fill(text);
    await expect(risk.locator('[data-status]'), text).toHaveText('Ikke funnet ennå');
  }
});

test('r8A-01: at 320 px no frame in the review tours scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  for (const role of ['fastlege', 'dps']) {
    await page.goto(`/#/gjennomgang/${role}/omvisning`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (let i = 0; i < 20; i++) {
      const over = await page.evaluate(() => {
        const body = document.querySelector('[data-tour-frame] [role="region"]');
        return body ? body.scrollWidth - body.clientWidth : 0;
      });
      expect(over, `${role} step ${i + 1}`).toBeLessThanOrEqual(1);
      const next = page.getByRole('button', { name: /^(Neste|Neste del)$/ });
      if (!(await next.isVisible())) break;
      await next.click();
    }
  }
});

test('r8A-02: at 320 × 256 the switch dialog shows the focused «Cancel» whole', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'English' }).click();
  const tab = page.locator('[data-feedback-tab]');
  await tab.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: 'The record: note, medicines, history' }).click();
  await panel(page).getByRole('textbox').first().fill('Halvferdig svar.');
  await tab.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: /The system’s reading/ }).click();
  const cancel = page.getByRole('dialog', { name: 'Switch form?' }).getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeFocused();
  await expect
    .poll(async () => {
      const box = await cancel.boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= 256;
    })
    .toBe(true);
});

test('r8A-03: at 341 × 225 with text spacing, the feedback tab is wholly in the window, below the header', async ({ page }) => {
  await page.setViewportSize({ width: 341, height: 225 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/timeliste');
  await page.addStyleTag({ content: SPACING });
  const tab = page.locator('[data-feedback-tab]');
  await expect(tab).toBeVisible();
  await expect
    .poll(async () => {
      const [t, header] = await Promise.all([tab.boundingBox(), page.locator('header').first().boundingBox()]);
      return !!t && !!header && t.y >= header.y + header.height - 1 && t.y + t.height <= 225;
    })
    .toBe(true);
});

test('r8A-04, r8A-05: a skip divider stays a centred label and, when focused by keyboard, shows the designed ring', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await gpWritesKari(page);
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await dpsAsksKari(page);
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByRole('button', { name: 'Ikke svar nå' }).focus();
  await page.keyboard.press('Enter');
  const divider = page.getByRole('listitem').filter({ hasText: 'Du svarte ikke på forespørselen.' });
  await expect(divider).toBeFocused();
  const style = await divider.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { align: cs.textAlign, outline: cs.outlineWidth, offset: cs.outlineOffset };
  });
  expect(style).toEqual({ align: 'center', outline: '2px', offset: '4px' });
});

test('r8A-06: at 320 px with text spacing, a long queue chip wraps and the preview banner keeps its labels inside their buttons', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await dpsAsksKari(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await go(page, '#/gjennomgang/dps/mottatte');
  await page.getByRole('button', { name: 'English' }).click();
  await page.addStyleTag({ content: SPACING });
  await expect(page.getByText('Assessed: request more information')).toBeVisible();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
  const chip = await page.getByText('Assessed: request more information').boundingBox();
  expect(chip!.x + chip!.width).toBeLessThanOrEqual(320);
  // The study preview's banner.
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto('about:blank');
  await page.goto('/#/studie?forhandsvisning');
  await page.getByRole('button', { name: 'Norsk' }).click();
  await page.addStyleTag({ content: SPACING });
  const end = page.getByRole('button', { name: 'Avslutt forhåndsvisning' });
  await expect(end).toBeVisible();
  const fits = await end.evaluate((b) => {
    const r = document.createRange();
    r.selectNodeContents(b);
    const text = [...r.getClientRects()];
    const box = b.getBoundingClientRect();
    return text.every((t) => t.left >= box.left - 0.5 && t.right <= box.right + 0.5);
  });
  expect(fits).toBe(true);
});
