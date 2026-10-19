import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockNettskjema, configWithoutForms } from './mock';
import { clickThroughTour, frame, panel, startStudy, sendForm, toStopPage } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/**
 * Press Tab until the target has focus, as a keyboard user would, and check
 * the focused control is not hidden under the sticky header or a panel
 * (WCAG 2.4.11).
 */
async function tabTo(page: Page, target: Locator, max = 150) {
  await expect(target).toBeAttached();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    // Re-resolved each time: a re-render may replace the element.
    if (await target.evaluate((el) => document.activeElement === el).catch(() => false)) {
      const clear = await target.evaluate((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return true;
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!top) return false;
        if (top === el || el.contains(top)) return true;
        // A hidden native input under its own Fluent control (radio, checkbox, switch).
        return top.contains(el) && !['HTML', 'BODY', 'MAIN'].includes(top.tagName) && !!top.closest('.fui-Radio, .fui-Checkbox, .fui-Switch, label, [data-choice]');
      });
      expect(clear, 'the focused control is not obscured').toBe(true);
      return;
    }
  }
  throw new Error(`Tab did not reach ${target}`);
}

test('keyboard only, GP: place, tag, confidence, decide, write and send the referral', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  const combo = page.getByRole('combobox', { name: 'Plasser saken' });
  await tabTo(page, combo);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-reading]')).toBeVisible();

  const tag = page.getByRole('button', { name: 'Diagnostisk', exact: true });
  await tabTo(page, tag);
  await page.keyboard.press('Space');
  await expect(tag).toHaveAttribute('aria-pressed', 'true');

  await tabTo(page, page.getByRole('textbox', { name: 'Beskriv kort hva som er uklart' }));
  await page.keyboard.type('Usikker på varighet og funksjon.');

  // Native radios: Tab enters the group, the arrows choose.
  await tabTo(page, page.getByRole('radio', { name: 'Lav', exact: true }));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Middels' })).toBeChecked();

  await tabTo(page, page.getByRole('radio', { name: 'Behold' }));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Henvis' })).toBeChecked();
  await tabTo(page, page.getByRole('button', { name: 'Lagre beslutning' }));
  await page.keyboard.press('Enter');
  const write = page.getByRole('button', { name: 'Skriv henvisningen' });
  await tabTo(page, write);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/henvisning$/);
  // The route change moves focus to the view's heading.
  await expect(page.locator('h1')).toBeFocused();
  await tabTo(page, page.getByRole('button', { name: 'Send henvisning' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/sendt$/);
});

test('keyboard only, DPS: place, choose an outcome, write the question and send', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await tabTo(page, page.getByRole('combobox', { name: 'Plasser saken' }));
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Henvisende fastlege plasserte saken/).filter({ visible: true }).first()).toBeVisible();
  await tabTo(page, page.getByRole('radio', { name: 'Be om mer informasjon' }));
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: 'Be om mer informasjon' })).toBeChecked();
  await tabTo(page, page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }));
  await page.keyboard.type('Hvordan er søvnen nå?');
  await tabTo(page, page.getByRole('button', { name: 'Send vurderingen' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/sendt$/);
});

test('keyboard only, study: the overview, the tour card, the form panel and «Vis ATLAS»', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await tabTo(page, page.getByRole('button', { name: 'Til oversikten' }));
  await page.keyboard.press('Enter');
  // The card before the tour opens from the study card and starts the tour from the keyboard.
  await tabTo(page, page.locator('[data-start-tour]'));
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await tabTo(page, dialog.getByRole('button', { name: 'Ikke nå' }));
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  // «Ikke nå» gives focus back to the button that opened the card.
  await expect(page.locator('[data-start-tour]')).toBeFocused();
  await page.keyboard.press('Enter');
  await tabTo(page, dialog.getByRole('button', { name: 'Start omvisningen' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Oversikten' })).toBeVisible();
  await clickThroughTour(page);
  await tabTo(page, page.getByRole('button', { name: 'Til oversikten' }));
  await page.keyboard.press('Enter');
  // 3.4: the start page's sheen leads to the list, where the study card opens the case.
  await tabTo(page, page.locator('[data-start-hero] [data-to-list]'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Timeliste i dag' })).toBeVisible();
  await tabTo(page, page.locator('[data-study-card] [data-open-case]'));
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: 'Start saken' }));
  await page.keyboard.press('Enter');
  await toStopPage(page);
  await tabTo(page, panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }));
  await page.keyboard.press('Enter');
  await tabTo(page, panel(page).getByRole('button', { name: 'Vis ATLAS' }));
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeHidden();
  await expect(frame(page).locator('#page')).toHaveText('Side 2 av 3');
  await expect(page.getByRole('combobox', { name: 'Plasser saken' }).first()).toBeVisible();
});

test('keyboard only, tour: move through the steps and place the practice case in the frame', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/omvisning');
  const next = page.getByRole('button', { name: /^(Neste|Neste del)$/ });
  for (let i = 0; i < 6; i++) {
    if (await page.getByRole('combobox', { name: 'Plasser saken' }).count()) break;
    await tabTo(page, next);
    await page.keyboard.press('Enter');
  }
  const combo = page.getByRole('combobox', { name: 'Plasser saken' }).first();
  await tabTo(page, combo);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-reading]').first()).toBeVisible();
});
