// Prints the information letter (public/informasjonsskriv.html) to PDF, one file per language, for invitations and for
// «Last ned PDF» on the letter's page. Run after changing the letter: npm run letter
//
//   public/informasjonsskriv.pdf     Norwegian
//   public/information-letter.pdf    English
//
// The page sets Segoe UI first; where it is missing (Linux), Inter stands in, as in the end-to-end tests.
import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const page = pathToFileURL(join(pub, 'informasjonsskriv.html')).href;
const out = { nb: 'informasjonsskriv.pdf', en: 'information-letter.pdf' };

const browser = await chromium.launch();
try {
  for (const [lang, file] of Object.entries(out)) {
    const tab = await browser.newPage();
    await tab.goto(`${page}#${lang}`);
    await tab.addStyleTag({ content: "body { font-family: 'Segoe UI', Inter, sans-serif; }" });
    await tab.emulateMedia({ media: 'print' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.pdf({ path: join(pub, file), format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log(`letter: ${lang} -> public/${file}`);
    await tab.close();
  }
} finally {
  await browser.close();
}
