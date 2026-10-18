import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The information letter: a static page beside the app, in Norwegian first and English on request, with a PDF of each.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('the information letter: Norwegian first, English on request, a PDF of each, and no serious accessibility issue', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/informasjonsskriv.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Vil du delta i evalueringen av ATLAS?' })).toBeVisible();
  await expect(page).toHaveTitle('Informasjonsskriv · ATLAS');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
  await expect(page.locator('#pdf')).toHaveAttribute('href', './informasjonsskriv.pdf');
  // The consent line the letter quotes is the one S1 asks for.
  await expect(page.locator('#nb')).toContainText('«Jeg har lest informasjonsskrivet og vil delta»');
  await expect(page.locator('#nb').getByRole('link', { name: 'jishnu.das@uia.no' })).toHaveAttribute('href', 'mailto:jishnu.das@uia.no');

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Would you like to take part in the evaluation of ATLAS?' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#pdf')).toHaveAttribute('href', './information-letter.pdf');
  await expect(page.locator('#nb')).toBeHidden();
  await expect(page).toHaveURL(/#en$/);

  for (const file of ['informasjonsskriv.pdf', 'information-letter.pdf']) {
    const res = await page.request.get(file);
    expect(res.status(), file).toBe(200);
    expect(res.headers()['content-type'], file).toContain('pdf');
  }

  const found: string[] = [];
  for (const hash of ['#nb', '#en']) {
    await page.goto(`/informasjonsskriv.html${hash}`);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    for (const v of result.violations) if (v.impact === 'serious' || v.impact === 'critical') found.push(`${hash}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  }
  expect(found, found.join('\n')).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the information letter opens in the language ATLAS is set to', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('atlas.settings.lang', JSON.stringify('en')));
  await page.goto('/informasjonsskriv.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Would you like to take part in the evaluation of ATLAS?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
});
