import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The information letter: a static page beside the app, in Norwegian first and English on request, with a PDF of each.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

/** S1's consent line, as the form asks for it: the letter quotes it word for word in both languages. */
function consentText(): { nb: string; en: string } {
  // Read from the instrument the app is built from (the tests run in app/).
  const instrument = JSON.parse(readFileSync('src/content/instrument.json', 'utf8')) as {
    forms: { pages: { items: { id: string; text: { nb: string; en: string } }[] }[] }[];
  };
  for (const form of instrument.forms)
    for (const page of form.pages) for (const item of page.items) if (item.id === 'SAMTYKKE') return item.text;
  throw new Error('No SAMTYKKE item in instrument.json');
}

/** axe at the given width, for both languages: no serious or critical issue. */
async function axeBoth(page: Page, width: number): Promise<string[]> {
  await page.setViewportSize({ width, height: 800 });
  const found: string[] = [];
  for (const hash of ['#nb', '#en']) {
    await page.goto(`/informasjonsskriv.html${hash}`);
    await expect(page.locator('html')).toHaveAttribute('lang', hash.slice(1));
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    for (const v of result.violations) if (v.impact === 'serious' || v.impact === 'critical') found.push(`${width} ${hash}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  }
  return found;
}

test('the information letter: Norwegian first, English on request, a PDF of each, and the consent line S1 asks for', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const consent = consentText();
  await page.goto('/informasjonsskriv.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Vil du delta i evalueringen av ATLAS?' })).toBeVisible();
  await expect(page).toHaveTitle('Informasjonsskriv · ATLAS');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
  await expect(page.locator('#pdf')).toHaveAttribute('href', './informasjonsskriv.pdf');
  // The consent line the letter quotes is the one S1 asks for, without its full stop.
  await expect(page.locator('#nb')).toContainText(`«${consent.nb.replace(/\.$/, '')}»`);
  await expect(page.locator('#nb').getByRole('link', { name: 'jishnu.das@uia.no' })).toHaveAttribute('href', 'mailto:jishnu.das@uia.no');
  // The wordmark is a name, not a way into a second ATLAS from the letter's tab.
  await expect(page.locator('.bar a')).toHaveCount(1);

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Would you like to take part in the evaluation of ATLAS?' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#pdf')).toHaveAttribute('href', './information-letter.pdf');
  await expect(page.locator('#nb')).toBeHidden();
  await expect(page).toHaveURL(/#en$/);
  await expect(page.locator('#en')).toContainText(`‘${consent.en.replace(/\.$/, '')}’`);

  for (const file of ['informasjonsskriv.pdf', 'information-letter.pdf']) {
    const res = await page.request.get(file);
    expect(res.status(), file).toBe(200);
    expect(res.headers()['content-type'], file).toContain('pdf');
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the information letter has no serious accessibility issue on a laptop or a phone, and keeps its tools named', async ({ page }) => {
  const found = [...(await axeBoth(page, 1366)), ...(await axeBoth(page, 390))];
  expect(found, found.join('\n')).toEqual([]);
  // At 390 px the tools show their icons only; their names stay.
  await page.goto('/informasjonsskriv.html#nb');
  await expect(page.locator('#print')).toHaveAccessibleName('Skriv ut');
  await expect(page.locator('#pdf')).toHaveAccessibleName('Last ned PDF');
});

test('the information letter opens in the language ATLAS is set to', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('atlas.settings.lang', JSON.stringify('en')));
  await page.goto('/informasjonsskriv.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Would you like to take part in the evaluation of ATLAS?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
});

test('Velkommen links to the letter with the site’s own configuration', async ({ page }) => {
  // The site's real atlas-config.json, untouched; nothing may reach a live form.
  await page.route('https://nettskjema.no/**', (route) => route.abort());
  await page.goto('/');
  const link = page.getByRole('link', { name: 'Les informasjonsskrivet' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', './informasjonsskriv.html');
  await expect(link).toHaveAttribute('target', '_blank');
  const res = await page.request.get(new URL((await link.getAttribute('href'))!, page.url()).href);
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('Vil du delta i evalueringen av ATLAS?');
});
