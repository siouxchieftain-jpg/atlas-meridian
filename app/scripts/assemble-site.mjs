// Assembles the Pages site in ../site: the built app and nothing else. The design files under the repository's
// meridian/ stay in the repository and are not published (3.5.2).
// Run with `npm run site` after `npm run build`.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const root = join(app, '..');
const dist = join(app, 'dist');
const site = join(root, 'site');

if (!existsSync(join(dist, 'index.html'))) throw new Error('assemble-site: build the app first (npm run build)');

rmSync(site, { recursive: true, force: true });
cpSync(dist, site, { recursive: true });
console.log(`assemble-site: the app -> ${site}`);
