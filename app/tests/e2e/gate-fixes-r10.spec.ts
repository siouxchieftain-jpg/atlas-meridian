import { expect, test, type Page } from '@playwright/test';
import { place } from './helpers';
import { configWithoutForms } from './mock';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/**
 * Behaviour fixed after the round-9 gate review (r9F, r9A). Each test names the finding it covers; each one fails on
 * the round-9 build (index-n_ZyTP1C.js) and passes on this one.
 */

const SPACING = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';

/** Move within the app without a reload, as the in-app links do. */
async function go(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
}

/** Review mode: the GP side decides to refer Kari and sends the referral. */
async function gpSendsKari(page: Page) {
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
}

test('r9F-01: after a return the DPS side played, «Skriv den nye henvisningen» opens a new referral that can be written and sent', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await gpSendsKari(page);
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Retur med råd').check({ force: true });
  await page.getByLabel('Situasjonell krise').check({ force: true });
  await page.getByRole('textbox', { name: 'Råd til fastlegen' }).fill('Prøv kommunalt tilbud først.');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByLabel('Henvis på nytt').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click();
  await page.getByRole('button', { name: 'Skriv den nye henvisningen' }).click();
  // The new draft: editable, carried from the first referral, beside the advice DPS gave.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ny henvisning');
  await expect(page.locator('main textarea')).toHaveCount(5);
  await expect(page.getByText('Fra den første henvisningen').first()).toBeVisible();
  await expect(page.getByText('Prøv kommunalt tilbud først.')).toBeVisible();
  await expect(page.getByText(/^Henvisningen ble sendt/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(page.getByText('Den nye henvisningen er sendt. Saken slutter her, uten svar fra DPS.')).toBeVisible();
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  // DPS's assessment and the GP's plan, each in its own row (r10F-05).
  await expect(page.locator('dt:has-text("DPS-vurdering") + dd')).toHaveText('Retur med råd');
  await expect(page.locator('dt:has-text("Fastlegens plan") + dd')).toHaveText('Henvis på nytt, og den nye henvisningen ble sendt');
});

test('r9A-01: on the summary, the caption under the title uses foreground 2 on the dawn', async ({ page }) => {
  await page.setViewportSize({ width: 341, height: 225 });
  await page.goto('/#/gjennomgang/dps/sak/astrid/oppsummering');
  const caption = page.getByText('Fastlegesiden er ikke spilt ennå, så det som står om fastlegen her, er eksempelsvar.');
  await expect(caption).toBeVisible();
  expect(await caption.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(66, 66, 66)');
});

test('r9A-02: at 320 px a tag’s definition opens above the review tab', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  const buttons = page.getByRole('button', { name: /^Hva betyr/ });
  await expect(buttons.first()).toBeVisible();
  for (let i = 0; i < (await buttons.count()); i++) {
    await buttons.nth(i).scrollIntoViewIfNeeded();
    await buttons.nth(i).click();
    const note = page.locator('[role="note"]').filter({ visible: true }).first();
    await expect(note).toBeVisible();
    const onTop = await note.evaluate((n) => {
      const r = n.getBoundingClientRect();
      const x = Math.min(r.right - 3, window.innerWidth - 3);
      const hit = document.elementFromPoint(x, r.top + r.height / 2);
      return !!hit && n.contains(hit);
    });
    expect(onTop, `note ${i + 1}`).toBe(true);
    await page.keyboard.press('Escape');
  }
});

test('r9F-04: a saved «Henvis» with no referral sent yet is what the GP summary says', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  await expect(page.locator('dt:has-text("Fastlegens beslutning") + dd')).toHaveText('Henvis, men henvisningen er ikke sendt ennå');
});

test('r9F-05: when the played GP side sent the referral without placing the case, the DPS summary says so', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/erlend/henvisning');
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await go(page, '#/gjennomgang/dps/sak/erlend/vurdering');
  await place(page, 3);
  await go(page, '#/gjennomgang/dps/sak/erlend/oppsummering');
  await expect(page.getByText('Fastlegen plasserte ikke saken. DPS plasserte den før systemets lesning ble vist.')).toBeVisible();
  await expect(page.getByText(/Fastlegen og DPS plasserte saken hver for seg/)).toHaveCount(0);
});

test('r9F-06: a saved draft counts as the GP side played, so DPS’s summary says the referral it read is an example', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/erlend/henvisning');
  await page.getByRole('button', { name: 'Lagre utkast' }).click();
  await go(page, '#/gjennomgang/dps/sak/erlend/oppsummering');
  await expect(page.getByText('Fastlegesiden har ikke sendt henvisningen, så henvisningen og det som står om fastlegen her, er eksempler.')).toBeVisible();
  await expect(page.getByText('Fastlegesiden er ikke spilt ennå', { exact: false })).toHaveCount(0);
});

test('r9F-07: back from the other side returns to the view the reviewer came from', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/henvisning');
  await page.getByRole('button', { name: 'Se fra den andre siden' }).first().click();
  await expect(page).toHaveURL(/\/dps\/sak\/kari\/vurdering$/);
  await page.getByRole('button', { name: 'Se fra den andre siden' }).first().click();
  await expect(page).toHaveURL(/\/fastlege\/sak\/kari\/henvisning$/);
});

test('r9A-03: at 320 × 256 the heading that takes focus after «Fortsett» is wholly in view', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await page.setViewportSize({ width: 320, height: 256 });
  await page.getByRole('button', { name: 'Fortsett' }).click();
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('Dialog med fastlegen');
  await expect(h1).toBeFocused();
  await expect
    .poll(async () => {
      const box = await h1.boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= 256;
    })
    .toBe(true);
});

test('r9A-04: a waiting text is the thread’s own note', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await gpSendsKari(page);
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  const wait = page.getByText('Fastlegen har ikke svart ennå. Svaret vises her når fastlegesiden har svart.');
  await expect(wait).toBeVisible();
  expect(await wait.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('dashed');
});

test('r9A-05, r9A-06: the review popover never scrolls sideways, and the clearing confirmation leads with the loss', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/timeliste');
  await page.locator('[data-feedback-tab]').click();
  const surface = page.locator('.fui-PopoverSurface').filter({ visible: true }).first();
  await expect(surface).toBeVisible();
  expect(await surface.evaluate((el) => getComputedStyle(el).overflowX)).toBe('hidden');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1366, height: 900 });
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  const ask = page.getByRole('dialog', { name: 'Fjerne DPS-vurderingen?' });
  await expect(ask.getByRole('button', { name: 'Fjern vurderingen og send' })).toBeVisible();
});

test('r9A-07: on a very short window the tab keeps to its icon inside the window; below 400 px the banner’s buttons stack', async ({ page }) => {
  await page.setViewportSize({ width: 341, height: 192 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/timeliste');
  await page.addStyleTag({ content: SPACING });
  const tab = page.locator('[data-feedback-tab]');
  await expect(tab).toBeVisible();
  await expect(tab).toHaveAccessibleName('Gi tilbakemelding');
  await expect
    .poll(async () => {
      const [t, header] = await Promise.all([tab.boundingBox(), page.locator('header').first().boundingBox()]);
      return !!t && !!header && t.height >= 24 && t.y >= header.y + header.height - 1 && t.y + t.height <= 192;
    })
    .toBe(true);
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto('about:blank');
  await page.goto('/#/studie?forhandsvisning');
  await page.getByRole('button', { name: 'Norsk' }).click();
  await page.addStyleTag({ content: SPACING });
  const end = page.getByRole('button', { name: 'Avslutt forhåndsvisning' });
  const csv = page.getByRole('button', { name: 'Last ned svarene som CSV' });
  await expect(end).toBeVisible();
  const [a, b] = await Promise.all([csv.boundingBox(), end.boundingBox()]);
  expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
