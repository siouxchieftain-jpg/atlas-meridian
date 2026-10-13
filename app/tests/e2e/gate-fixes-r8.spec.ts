import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema } from './mock';
import { panel, sendForm, startStudy } from './helpers';

/**
 * Behaviour fixed after the round-7 gate review (r7F, r7A). Each test names the finding it covers; each one fails on
 * the round-7 build (index-DlCXMcxM.js) and passes on this one.
 */

/** Move within the app without a reload, as the in-app links do. */
async function go(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
}

/** Review mode: the GP side sends Kari's referral. */
async function gpSendsKari(page: Page) {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
}

/** Review mode: the DPS side asks the GP a question about Kari. */
async function dpsAsksKari(page: Page) {
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
}

test('r7F-01: what says a criterion was not assessed, points elsewhere or is about something else does not count; a death wish behind «vet ikke» does', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/henvisning');
  const guide = page.locator('[data-guide="draft"]').filter({ visible: true }).first();
  const risk = page.locator('[data-section="henvisning-risiko"]');
  await expect(guide).toContainText('4 av 5 kriterier omtalt');
  for (const text of [
    'Glemte å spørre om suicidalitet.',
    'Ingen risikovurdering foreligger.',
    'Har ikke tatt stilling til risiko.',
    'Vil vurdere suicidalitet ved neste konsultasjon.',
    'Viser til epikrise fra legevakten.',
    'Høy risiko for langvarig sykefravær.',
  ]) {
    await risk.locator('textarea').fill(text);
    await expect(risk.locator('[data-status]'), text).toHaveText('Ikke funnet ennå');
    await expect(guide).toContainText('4 av 5 kriterier omtalt');
  }
  await risk.locator('textarea').fill('Hun vet ikke om hun orker å leve så mye lenger. Ukjent for familien har han kjøpt tau.');
  await expect(risk.locator('[data-status]')).toHaveText('Omtalt');
  await expect(guide).toContainText('5 av 5 kriterier omtalt');
  // Erlend's draft: Funksjonsfall.
  await go(page, '#/gjennomgang/fastlege/sak/erlend/henvisning');
  const fn = page.locator('[data-section="henvisning-funksjon"]');
  for (const text of ['Se aktuelt.', 'Usikker på funksjonsnivået.', 'Funksjonsnivå bes vurdert ved DPS.']) {
    await fn.locator('textarea').fill(text);
    await expect(fn.locator('[data-status]'), text).toHaveText('Ikke funnet ennå');
  }
});

test('r7F-02, r7A-11: after the GP’s «Ikke spør nå», DPS’s dialog, queue and summary all say that no question came', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.getByRole('button', { name: 'Ikke spør nå' }).click();
  await go(page, '#/gjennomgang/dps/sak/astrid/dialog');
  await expect(page.getByRole('listitem').filter({ hasText: 'Fastlegen sendte ikke noe spørsmål om returen.' })).toBeVisible();
  await expect(page.getByText('Fastlegen svarte ikke på forespørselen.')).toHaveCount(0);
  await go(page, '#/gjennomgang/dps/mottatte');
  const row = page.getByRole('link', { name: /Astrid Holm/ });
  await expect(row.getByText('Vurdert 16. mars 2026')).toBeVisible();
  await expect(row.getByText('Ny melding')).toHaveCount(0);
  await go(page, '#/gjennomgang/dps/sak/astrid/oppsummering');
  await expect(page.locator('dt:has-text("Spørsmål fra fastlegen") + dd')).toHaveText('Ingen');
  await expect(page.locator('dt', { hasText: 'DPS-vurdering' })).toHaveCount(0);
});

test('r7F-02: when the GP does not reply to a played request, the DPS queue says so instead of «Ny melding»', async ({ page }) => {
  await gpSendsKari(page);
  await dpsAsksKari(page);
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await go(page, '#/gjennomgang/dps/mottatte');
  const row = page.getByRole('link', { name: /Kari Nordli/ });
  await expect(row.getByText('Fastlegen svarte ikke')).toBeVisible();
  await expect(row.getByText('Ny melding')).toHaveCount(0);
});

test('r7F-03, r7A-08: «Ikke svar nå» is a divider under the request it answers, before DPS’s later choice, said to each side in its own words', async ({ page }) => {
  await gpSendsKari(page);
  await dpsAsksKari(page);
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Du svarte ikke på forespørselen.' })).toBeVisible();
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await expect(page.getByRole('listitem').filter({ hasText: 'Fastlegen svarte ikke på forespørselen.' })).toBeVisible();
  await page.getByLabel('Rett til helsehjelp').check({ force: true });
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  const items = await page.locator('ol > li').allTextContents();
  const skip = items.findIndex((x) => x.includes('Fastlegen svarte ikke på forespørselen.'));
  const final = items.findIndex((x) => x.includes('Rett til helsehjelp'));
  expect(skip).toBeGreaterThan(-1);
  expect(final).toBeGreaterThan(skip);
});

test('r7F-03: once the GP side is played, DPS sees no example receipt of its return', async ({ page }) => {
  await gpSendsKari(page);
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Retur med råd').check({ force: true });
  await page.getByLabel('Situasjonell krise').check({ force: true });
  await page.getByRole('textbox', { name: 'Råd til fastlegen' }).fill('Prøv kommunalt tilbud først.');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/plan');
  await page.getByLabel('Henvis på nytt').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Kari følges opp videre hos fastlegen')).toHaveCount(0);
});

test('r7F-03, r8F-01: a final choice DPS made after the example reply goes once the GP side plays, and DPS decides again after the played reply', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  // The GP side is not played: the example reply stands in, and DPS decides after it.
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await page.getByLabel('Rett til helsehjelp').check({ force: true });
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await expect(page.locator('[data-section="endelig-vurdering"]')).toHaveCount(0);
  // The GP side sends its own referral: DPS's assessment of the example one goes, after a confirmation (r8F-01).
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await page.getByRole('dialog', { name: 'Fjerne DPS-vurderingen?' }).getByRole('button', { name: 'Fjern vurderingen og send' }).click();
  // DPS asks again, the GP side replies, and the final choice is due after the played reply.
  await dpsAsksKari(page);
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.locator('[data-section="composer"] textarea').fill('Søvnen er fortsatt dårlig.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await expect(page.getByText('Søvnen er fortsatt dårlig.')).toBeVisible();
  await expect(page.locator('[data-section="endelig-vurdering"]')).toBeVisible();
});

test('r7F-04: a summary in review mode says once, under its title, what rests on the other side’s example', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/kari/oppsummering');
  await expect(page.getByText('Fastlegesiden er ikke spilt ennå, så det som står om fastlegen her, er eksempelsvar.')).toBeVisible();
  // The GP side's summary marks it once a row rests on an example: after the referral is sent (r8F-06).
  await gpSendsKari(page);
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  await expect(page.getByText('DPS-siden er ikke spilt ennå, så det som står om DPS her, er eksempelsvar.')).toBeVisible();
});

test('r7F-06: «Om deg» says the role goes with the forms that are sent, not that it was sent', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await go(page, '#/studie/om-deg');
  await expect(page.getByText('Rollen, svaret og studienavnet følger med skjemaene du sender, og kan ikke endres.')).toBeVisible();
});

test('r7F-07: Erlend’s quoted rejection is set in curly quotes in English', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/erlend/konsultasjon');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByText('“The patient can be adequately treated in primary care.”').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('"The patient can be adequately treated in primary care."')).toHaveCount(0);
});

test('r7A-01, r7A-10: a notice follows a language switch without being said again; closing it gives focus to the heading', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/monster');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hele skjermbildet' }).click();
  await panel(page).getByRole('button', { name: /^Send/ }).last().click();
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toBeVisible();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByText('Thank you. The feedback has been recorded.')).toBeVisible();
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('r7A-02: at 320 px the tour’s long Norwegian headings wrap inside the window', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto('/#/gjennomgang/fastlege/omvisning');
  for (let i = 0; i < 16; i++) {
    const h1 = page.getByRole('heading', { level: 1 });
    const [box, width] = await Promise.all([h1.boundingBox(), page.evaluate(() => document.documentElement.clientWidth)]);
    expect(box!.x + box!.width, await h1.textContent() ?? '').toBeLessThanOrEqual(width);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, await h1.textContent() ?? '').toBeLessThanOrEqual(0);
    const next = page.getByRole('button', { name: /^(Neste|Neste del)$/ });
    if (!(await next.isVisible())) break;
    await next.click();
  }
});

test('r7A-03: «Avbryt» has focus as soon as a confirmation opens, so a key pressed at once cannot confirm', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/timeliste');
  await expect(page.getByRole('button', { name: 'Start på nytt' })).toBeVisible();
  const focused = await page.evaluate(async () => {
    document.querySelector<HTMLButtonElement>('button[aria-label="Start på nytt"]')!.click();
    // One task later, before the next frame.
    await new Promise((r) => setTimeout(r, 0));
    return document.activeElement?.textContent?.trim() ?? '';
  });
  expect(focused).toBe('Avbryt');
});

test('r7A-04, r7A-05: the open part’s mark stays on one line, and the form’s heading names the part', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Journalen: notat, legemidler, historikk' }).click();
  await expect(panel(page).getByRole('heading', { level: 2, name: /^Skjema:/ })).toHaveText('Skjema: Gjennomgang · Journalen: notat, legemidler, historikk');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  const mark = page.getByRole('dialog').getByText('Åpent nå');
  await expect(mark).toBeVisible();
  expect(await mark.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('nowrap');
});

test('r7A-06: «Start på nytt» keeps an open feedback form and what was typed in it', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Journalen: notat, legemidler, historikk' }).click();
  await panel(page).getByRole('textbox', { name: 'Hva fungerer her?' }).fill('Halvferdig svar.');
  await page.getByRole('button', { name: 'Start på nytt' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ja, start på nytt' }).click();
  await expect(page.getByText('Gjennomgangen er startet på nytt.')).toBeVisible();
  await expect(panel(page).getByRole('textbox', { name: 'Hva fungerer her?' })).toHaveValue('Halvferdig svar.');
});

test('r7A-07: at 341 × 225, also with text spacing, the feedback tab is centred below the header, clear of «Hjelp»', async ({ page }) => {
  await page.setViewportSize({ width: 341, height: 225 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/timeliste');
  const tab = page.locator('[data-feedback-tab]');
  await expect(tab).toBeVisible();
  const clear = async () => {
    const [t, h] = await Promise.all([tab.boundingBox(), page.getByRole('button', { name: 'Hjelp' }).boundingBox()]);
    const overlaps = t!.x < h!.x + h!.width && t!.x + t!.width > h!.x && t!.y < h!.y + h!.height && t!.y + t!.height > h!.y;
    expect(overlaps).toBe(false);
  };
  await clear();
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }' });
  await clear();
});

test('r7A-09: in English the switch dialog calls R2 by the title the panel shows', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'English' }).click();
  await go(page, '#/gjennomgang/tilbakemeldinger');
  await page.getByRole('button', { name: 'Give an overall impression' }).click();
  await expect(panel(page)).toContainText('Summing up');
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByRole('button', { name: 'Give feedback' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'The record: note, medicines, history' }).click();
  const ask = page.getByRole('dialog', { name: 'Switch form?' });
  await expect(ask).toContainText('‘Summing up’');
  await expect(ask).not.toContainText('Overall impression');
});

test('r7A-12: at 390 × 844 a cancelled switch gives focus to the form’s heading, not to the tab under it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  const tab = page.getByRole('button', { name: 'Gi tilbakemelding' });
  await tab.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Journalen: notat, legemidler, historikk' }).click();
  await expect(panel(page)).toBeVisible();
  await tab.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: 'Systemets lesning' }).click();
  const ask = page.getByRole('dialog', { name: 'Bytte skjema?' });
  await ask.getByRole('button', { name: 'Avbryt' }).click();
  await expect(panel(page).getByRole('heading', { level: 2, name: /^Skjema:/ })).toBeFocused();
});
