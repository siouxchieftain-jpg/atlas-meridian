// Builds the 14 Nettskjema forms from src/content/instrument.json through the Nettskjema API v3, the same
// file the build sheet and the app's preview forms come from.
//
//   node scripts/nettskjema.mjs plan     what would be created; no login, nothing is sent
//   node scripts/nettskjema.mjs create   creates the forms that have no address yet, writes their addresses
//                                        into public/atlas-config.json, then checks each one (--only S1,S3 limits it)
//   node scripts/nettskjema.mjs update   brings existing forms in line with the instrument; refuses a form with answers
//   node scripts/nettskjema.mjs verify   reads every form back and compares it with the instrument
//   node scripts/nettskjema.mjs status   answers per form
//
// --round pilot works on the pilot set instead: a copy of the study forms (S1 to S9, not R1 and R2), titled
// «(pilot)», whose addresses go under «pilotForms» in atlas-config.json. While the config says "round": "pilot", the
// app answers into this set, so no pilot answer ever lands in a study form.
//
// The API client's ID and secret are read from a file only the owner keeps (default
// %USERPROFILE%/nettskjema-api/atlas.json, or NETTSKJEMA_CREDENTIALS): {"clientId": "...", "clientSecret": "...",
// "editor": "<Nettskjema username>"}; without "editor" (or --editor), create and update take the person who already
// edits the forms the config names. The script never prints the secret or the token, never sends an answer and
// never deletes anything: test answers are deleted by the owner in Nettskjema («Slett alle svar»).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const instrument = JSON.parse(readFileSync(join(app, 'src/content/instrument.json'), 'utf8'));
const configPath = join(app, 'public/atlas-config.json');

const SITE = 'https://siouxchieftain-jpg.github.io/atlas-meridian/';
const API = 'https://nettskjema.no/api/v3';
const TOKEN_URL = 'https://authorization.nettskjema.no/oauth2/token';
const ANSWER_URL = (id) => `https://nettskjema.no/a/${id}`;
const LONG_TEXT_MAX = 3800;

const SCALES = { agree7: [1, 7], confidence7: [1, 7], helpful7: [1, 7], nps11: [0, 10], clarity5: [1, 5] };
const ROLE_LABEL = { fastlege: { nb: 'fastlege', en: 'GP' }, dps: { nb: 'DPS', en: 'DPS' } };

const [, , mode = 'plan', ...rest] = process.argv;
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

/** The set this run works on: the study forms, or the pilot copy of them. */
const ROUND = flag('round') === 'pilot' ? 'pilot' : 'study';
const SET = ROUND === 'pilot' ? 'pilotForms' : 'forms';
const inRound = (form) => ROUND === 'study' || /^S\d/.test(form.key);
const roundForms = () => instrument.forms.filter(inRound);

/** The step a form belongs to (S2.fastlege → S2): sendt.html marks only the form its receipt names. */
const stepOf = (key) => key.split('.')[0];

/* ---------- From the instrument to Nettskjema elements ---------- */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const para = (s) => `<p>${esc(s)}</p>`;
const both = (t) => (t.nb === t.en ? t.nb : `${t.nb} / ${t.en}`);

export function formTitle(form, round = ROUND) {
  const variant = form.key.split('.')[1];
  const role = variant ? ROLE_LABEL[variant] : undefined;
  const nb = role ? `${form.title.nb}, ${role.nb}` : form.title.nb;
  const en = role ? `${form.title.en}, ${role.en}` : form.title.en;
  return `ATLAS: ${nb === en ? nb : `${nb} / ${en}`}${round === 'pilot' ? ' (pilot)' : ''}`;
}

// Nettskjema's rule for a form title (the API schema's pattern, written so a JavaScript expression accepts it):
// letters, digits, spaces and a short list of signs; «·» and curly quotes are refused. At most 130 characters.
const TITLE_SIGNS = /^[#`'"=!&+{}[\]*;:()/.,?_«»¿¡€¢–\-@\d\s\p{L}]+$/u;
export function titleProblem(title) {
  if (title.length > 130) return `title longer than 130 characters (${title.length})`;
  const bad = [...new Set([...title].filter((ch) => !TITLE_SIGNS.test(ch)))];
  return bad.length ? `title has signs Nettskjema refuses: ${bad.join(' ')}` : undefined;
}

function question(it, type, extra = {}) {
  const description = [para(it.text.en)];
  if (it.privacyLine) description.push(`<p><em>${esc(both(instrument.privacyLine))}</em></p>`);
  return {
    elementType: type,
    text: it.text.nb,
    description: description.join(''),
    isMandatory: it.required === true,
    externalElementId: it.codebook,
    ...extra,
  };
}

function options(it) {
  return it.options.map((o, i) => ({ sequence: i + 1, text: both(o), externalAnswerOptionId: String(i + 1) }));
}

function itemElement(it) {
  if (it.type in SCALES) {
    const [min, max] = SCALES[it.type];
    return question(it, 'LINEAR_SCALE', {
      minimumValue: min,
      maximumValue: max,
      linearScaleType: 'START_END',
      minimumValueText: it.anchors ? both(it.anchors.low) : undefined,
      maximumValueText: it.anchors ? both(it.anchors.high) : undefined,
    });
  }
  switch (it.type) {
    case 'choice':
    case 'importance3':
      return question(it, 'RADIO', { answerOptions: options(it) });
    case 'consent':
      return question(it, 'CHECKBOX', { answerOptions: options(it) });
    case 'text':
      return question(it, 'QUESTION');
    case 'longtext':
      return question(it, 'QUESTION_MULTILINE', { maxNumberOfCharacters: LONG_TEXT_MAX });
    case 'stop':
      // A text element's content is its description; Nettskjema keeps «text» for headings (at most 180 characters).
      return { elementType: 'TEXT', description: `<p><strong>${esc(it.text.nb)}</strong></p>${para(it.text.en)}` };
    case 'locked':
      // Filled and locked by ATLAS from the address: CB<codebook>=<value>&LCK<codebook>=true.
      return question({ ...it, required: false }, 'QUESTION');
    default:
      throw new Error(`no Nettskjema element for item type «${it.type}» (${it.id})`);
  }
}

/** The form's elements, in the order the preview shows them. */
export function formElements(form) {
  const out = [];
  // At the top of every form: the intro (with the consent line) and the privacy line.
  const intro = [para(form.intro.nb), para(form.intro.en)];
  if (!form.intro.nb.includes(instrument.consentLine.nb)) intro.push(para(instrument.consentLine.nb), para(instrument.consentLine.en));
  intro.push(`<p><em>${esc(both(instrument.privacyLine))}</em></p>`);
  out.push({ elementType: 'TEXT', description: intro.join('') });
  form.pages.forEach((page, pi) => {
    if (pi > 0) out.push({ elementType: 'PAGE_BREAK' });
    const locked = page.items.filter((it) => it.type === 'locked');
    const lockedBlock = () => [{ elementType: 'HEADING', text: both(instrument.lockedHeading) }, ...locked.map(itemElement)];
    // The locked fields sit where the preview puts them: first when the page starts with them, else last.
    const lockedFirst = locked.length > 0 && page.items[0]?.type === 'locked';
    if (lockedFirst) out.push(...lockedBlock());
    for (const it of page.items) if (it.type !== 'locked') out.push(itemElement(it));
    if (locked.length > 0 && !lockedFirst) out.push(...lockedBlock());
  });
  return out.map((e, i) => ({ ...e, sequence: i + 1 }));
}

export function formSettings(form, editors) {
  return {
    title: formTitle(form),
    formType: 'DEFAULT',
    languageCode: 'nb',
    collectsPersonalData: false,
    sensitivePersonalDataCollected: false,
    respondentGroup: 'ALL',
    codebookActivated: true,
    postponable: false,
    sendingReceiptToRespondent: false,
    offeringReceiptToRespondent: false,
    editorsSubmissionEmailType: 'NONE',
    receiptText: `${para(form.receipt.nb)}${para(form.receipt.en)}<div><a class="receipt-link-as-button" href="${SITE}sendt.html?skjema=${stepOf(form.key)}" rel="noopener noreferrer">Tilbake til ATLAS</a></div>`,
    editors: editors.map((username) => ({ username })),
  };
}

export function payload(form, editors) {
  return { formSettings: formSettings(form, editors), elements: formElements(form) };
}

/* ---------- Credentials, token and requests (never printed) ---------- */

function credentials() {
  const path = process.env.NETTSKJEMA_CREDENTIALS || join(homedir(), 'nettskjema-api', 'atlas.json');
  if (!existsSync(path)) throw new Error(`no credentials file at ${path}`);
  const c = JSON.parse(readFileSync(path, 'utf8'));
  if (!c.clientId || !c.clientSecret || /^PASTE/.test(c.clientId) || /^PASTE/.test(c.clientSecret)) throw new Error('the credentials file has no client ID or secret');
  const editor = flag('editor') || c.editor;
  return { id: String(c.clientId).trim(), secret: String(c.clientSecret).trim(), editor: editor ? String(editor).trim() : undefined };
}

let token;
async function getToken(c) {
  if (token) return token;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`token: HTTP ${res.status}`);
  token = (await res.json()).access_token;
  return token;
}

async function api(c, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await getToken(c)}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : undefined;
}

/* ---------- Addresses in public/atlas-config.json ---------- */

const readConfig = () => JSON.parse(readFileSync(configPath, 'utf8'));
const formIdOf = (address) => {
  const m = /^https:\/\/nettskjema\.no\/a\/(\d+)\/?$/.exec(String(address || '').trim());
  return m ? Number(m[1]) : undefined;
};
const addressOf = (cfg, key) => (cfg[SET] ?? {})[key];
function saveAddress(key, formId) {
  const cfg = readConfig();
  cfg[SET] = { ...(cfg[SET] ?? {}), [key]: ANSWER_URL(formId) };
  writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
}

/**
 * The person who edits the forms beside the API client: --editor, the credentials file's "editor", or else the person
 * already editing the forms this config names (the first editor that is not an API client). Only a username, never a
 * secret, is printed.
 */
async function editorFor(c) {
  if (c.editor) return c.editor;
  const cfg = readConfig();
  for (const [key, address] of Object.entries({ ...(cfg.forms ?? {}), ...(cfg.pilotForms ?? {}) })) {
    const id = formIdOf(address);
    if (!id) continue;
    const s = await api(c, 'GET', `/form/${id}/settings`);
    const human = (s?.editors ?? []).map((e) => e?.username).find((u) => u && !/@apiclient$/.test(u));
    if (human) {
      console.log(`Editor: ${human} (the editor of ${key}, form ${id})`);
      return human;
    }
  }
  return undefined;
}

/* ---------- Verify: the form as stored against the instrument ---------- */

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').replace(/<p>\s*<\/p>/g, '').trim();
const plain = (s) =>
  norm(String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));

async function verifyForm(c, form, formId) {
  const want = formElements(form);
  const got = await api(c, 'GET', `/form/${formId}/elements`);
  const problems = [];
  if (!Array.isArray(got)) return ['no element list came back'];
  if (got.length !== want.length) problems.push(`${got.length} elements, expected ${want.length}`);
  // In the form's order, as the list comes back («sequence» starts again on each page).
  want.forEach((w, i) => {
    const g = got[i];
    const where = `element ${i + 1} (${w.externalElementId ?? w.elementType})`;
    if (!g) return;
    if (g.elementType !== w.elementType) problems.push(`${where}: type ${g.elementType}, expected ${w.elementType}`);
    if (w.text !== undefined && w.elementType !== 'TEXT' && norm(g.text) !== norm(w.text)) problems.push(`${where}: text differs`);
    if (w.description !== undefined && plain(g.description) !== plain(w.description)) problems.push(`${where}: English text differs`);
    if (w.externalElementId && g.externalElementId !== w.externalElementId) problems.push(`${where}: codebook «${g.externalElementId ?? ''}», expected «${w.externalElementId}»`);
    if (w.isMandatory !== undefined && Boolean(g.isMandatory) !== w.isMandatory) problems.push(`${where}: required ${Boolean(g.isMandatory)}, expected ${w.isMandatory}`);
    if (w.minimumValue !== undefined && (g.minimumValue !== w.minimumValue || g.maximumValue !== w.maximumValue)) problems.push(`${where}: scale ${g.minimumValue} to ${g.maximumValue}`);
    if (w.answerOptions) {
      const go = (g.answerOptions ?? []).map((o) => `${o.externalAnswerOptionId ?? ''}=${o.text}`).join('; ');
      const wo = w.answerOptions.map((o) => `${o.externalAnswerOptionId}=${o.text}`).join('; ');
      if (go !== wo) problems.push(`${where}: options «${go}», expected «${wo}»`);
    }
  });
  const s = await api(c, 'GET', `/form/${formId}/settings`);
  const ws = formSettings(form, []);
  for (const k of ['title', 'respondentGroup', 'collectsPersonalData', 'sensitivePersonalDataCollected', 'codebookActivated']) {
    if (s?.[k] !== ws[k]) problems.push(`setting ${k}: ${JSON.stringify(s?.[k])}, expected ${JSON.stringify(ws[k])}`);
  }
  problems.push(...receiptProblems(s?.receiptText, form.key));
  return problems;
}

/**
 * The receipt must lead back with the form's own name (`sendt.html?skjema=S3`): sendt.html then marks only that step,
 * and S9's receipt marks none. A receipt without the name would mark whatever step is waiting.
 */
export function receiptProblems(receiptText, key) {
  const text = String(receiptText ?? '');
  if (!text.includes(`${SITE}sendt.html`)) return ['receipt: the button back to ATLAS is missing'];
  const link = `${SITE}sendt.html?skjema=${stepOf(key)}"`;
  if (text.includes(link)) return [];
  const at = text.indexOf(`${SITE}sendt.html`);
  const found = text.slice(at + SITE.length, at + SITE.length + 40).replace(/\s+/g, ' ');
  return [`receipt: the button back to ATLAS does not name the form (sendt.html?skjema=${stepOf(key)}); it reads «${found}»`];
}

/* ---------- Modes ---------- */

const pad = (s, n) => String(s).padEnd(n);

function summaryRow(form) {
  const items = form.pages.flatMap((p) => p.items);
  const questions = items.filter((it) => it.type !== 'locked' && it.type !== 'stop');
  const required = questions.filter((it) => it.required).length;
  return `${pad(form.key, 12)} ${pad(formTitle(form), 62)} ${pad(form.pages.length, 5)} ${pad(questions.length, 9)} ${pad(required, 8)} ${form.locked.join(', ')}`;
}

async function plan() {
  const editors = ['<API-klienten>@apiclient', '<din Nettskjema-bruker>'];
  const all = roundForms().map((f) => ({ key: f.key, body: payload(f, editors) }));
  let schemaNote = 'not checked against the API schema (run with --spec <api-docs.json>)';
  const specPath = flag('spec');
  if (specPath) {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    // Text patterns in the spec use escapes a JavaScript regular expression refuses; the shape is what matters here.
    const spec = JSON.parse(readFileSync(specPath, 'utf8'), (k, v) => (k === 'pattern' ? undefined : v));
    const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
    ajv.addSchema({ $id: 'spec', components: spec.components });
    const check = ajv.compile({ $ref: 'spec#/components/schemas/FormSettingsAndElementsDTO' });
    const bad = all.filter((p) => !check(p.body)).map((p) => `${p.key}: ${ajv.errorsText(check.errors)}`);
    // The request schema is loose, so also insist on the required settings and known element types.
    const required = spec.components.schemas.CreateFormSettingsDTO.required;
    const types = spec.components.schemas.ElementDTO.properties.elementType.enum;
    for (const p of all) {
      for (const r of required) if (p.body.formSettings[r] === undefined) bad.push(`${p.key}: setting ${r} missing`);
      for (const e of p.body.elements) if (!types.includes(e.elementType)) bad.push(`${p.key}: unknown element type ${e.elementType}`);
    }
    if (bad.length) {
      console.error(bad.join('\n'));
      process.exitCode = 1;
    }
    schemaNote = bad.length ? `${bad.length} problems against the API schema` : `${all.length} of ${all.length} match the API schema`;
  }
  // The schema check leaves out text patterns, so the title rule is checked here.
  const titles = roundForms().map((f) => [f.key, titleProblem(formTitle(f))]).filter(([, p]) => p);
  if (titles.length) {
    console.error(titles.map(([k, p]) => `${k}: ${p}`).join('\n'));
    process.exitCode = 1;
  }
  const out = flag('out');
  if (out) writeFileSync(out, `${JSON.stringify(all, null, 2)}\n`);
  console.log('Nettskjema plan: nothing is created and nothing is sent.');
  console.log(`Source: app/src/content/instrument.json, ${roundForms().length} forms (${ROUND === 'pilot' ? 'the pilot set, under pilotForms' : 'the study set, under forms'}). Payloads: ${schemaNote}.`);
  console.log('');
  console.log(`${pad('Form', 12)} ${pad('Title in Nettskjema', 62)} ${pad('Pages', 5)} ${pad('Questions', 9)} ${pad('Required', 8)} Locked fields`);
  for (const f of roundForms()) console.log(summaryRow(f));
}

async function create() {
  const c = credentials();
  const editor = await editorFor(c);
  if (!editor) throw new Error('no editor: add "editor" to the credentials file or pass --editor <Nettskjema username>');
  const only = flag('only')?.split(',').map((s) => s.trim());
  const editors = [`${c.id}@apiclient`, editor];
  for (const form of roundForms()) {
    if (only && !only.includes(form.key)) continue;
    const existing = formIdOf(addressOf(readConfig(), form.key));
    if (existing) {
      console.log(`${pad(form.key, 12)} already has an address (form ${existing}); left as it is`);
      continue;
    }
    const titleBad = titleProblem(formTitle(form));
    if (titleBad) throw new Error(`${form.key}: ${titleBad}`);
    const { formId } = await api(c, 'POST', '/form', payload(form, editors));
    saveAddress(form.key, formId);
    // The codebook names: set them explicitly if the create call did not keep them.
    const got = await api(c, 'GET', `/form/${formId}/elements`);
    const want = formElements(form);
    const elementMap = {};
    const optionMap = {};
    // The list comes back in the form's order. («sequence» starts again on each page, and a page break has no id.)
    got.forEach((g, i) => {
      const w = want[i];
      if (!w?.externalElementId || g.elementId == null) return;
      if (g.externalElementId !== w.externalElementId) elementMap[g.elementId] = w.externalElementId;
      (g.answerOptions ?? []).forEach((o, j) => {
        const code = w.answerOptions?.[j]?.externalAnswerOptionId;
        if (code && o.answerOptionId != null && o.externalAnswerOptionId !== code) optionMap[o.answerOptionId] = code;
      });
    });
    if (Object.keys(elementMap).length || Object.keys(optionMap).length) {
      await api(c, 'PUT', `/form/${formId}/codebook`, { elementIdsAndExternalElementIdsMap: elementMap, subElementIdsAndExternalElementIdsMap: {}, answerOptionIdsAndExternalAnswerOptionIdsMap: optionMap });
    }
    const problems = await verifyForm(c, form, formId);
    console.log(`${pad(form.key, 12)} created: ${ANSWER_URL(formId)}${problems.length ? `\n  check: ${problems.join('\n  check: ')}` : ', checked: matches the instrument'}`);
  }
}

/** Brings forms that already exist in line with the instrument. Refuses a form that has answers. */
async function update() {
  const c = credentials();
  const editor = await editorFor(c);
  if (!editor) throw new Error('no editor: add "editor" to the credentials file or pass --editor <Nettskjema username>');
  const only = flag('only')?.split(',').map((s) => s.trim());
  const editors = [`${c.id}@apiclient`, editor];
  const mine = await api(c, 'GET', '/form/me');
  const answers = new Map((mine ?? []).map((f) => [f.formId, f.numberOfDeliveredSubmissions ?? 0]));
  for (const form of roundForms()) {
    if (only && !only.includes(form.key)) continue;
    const id = formIdOf(addressOf(readConfig(), form.key));
    if (!id) {
      console.log(`${pad(form.key, 12)} no address yet: use create`);
      continue;
    }
    if ((answers.get(id) ?? 0) > 0) {
      console.log(`${pad(form.key, 12)} has ${answers.get(id)} answers: left as it is (delete the test answers in Nettskjema first)`);
      continue;
    }
    await api(c, 'PATCH', `/form/${id}/settings`, formSettings(form, editors));
    await api(c, 'PUT', `/form/${id}/elements`, formElements(form));
    const problems = await verifyForm(c, form, id);
    console.log(`${pad(form.key, 12)} updated${problems.length ? `\n  check: ${problems.join('\n  check: ')}` : ', checked: matches the instrument'}`);
  }
}

async function verify() {
  const c = credentials();
  const cfg = readConfig();
  let bad = 0;
  for (const form of roundForms()) {
    const id = formIdOf(addressOf(cfg, form.key));
    if (!id) {
      console.log(`${pad(form.key, 12)} no address yet`);
      continue;
    }
    const problems = await verifyForm(c, form, id);
    if (problems.length) bad++;
    console.log(`${pad(form.key, 12)} ${problems.length ? `${problems.length} differences\n  ${problems.join('\n  ')}` : 'matches the instrument'}`);
  }
  if (bad) process.exitCode = 1;
}

async function status() {
  const c = credentials();
  const cfg = readConfig();
  const mine = await api(c, 'GET', '/form/me');
  const byId = new Map((mine ?? []).map((f) => [f.formId, f]));
  for (const form of roundForms()) {
    const id = formIdOf(addressOf(cfg, form.key));
    const f = id ? byId.get(id) : undefined;
    console.log(`${pad(form.key, 12)} ${id ? (f ? `${f.numberOfDeliveredSubmissions ?? 0} answers, ${f.open ? 'open' : 'closed'}` : `form ${id} is not visible to the client`) : 'no address yet'}`);
  }
}

const modes = { plan, create, update, verify, status };
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (!modes[mode]) {
    console.error(`unknown mode «${mode}»: use plan, create, update, verify or status`);
    process.exit(2);
  }
  modes[mode]().catch((e) => {
    // Error messages carry the HTTP status and Nettskjema's message, never the secret or the token.
    console.error(`nettskjema ${mode}: ${e.message}`);
    process.exit(1);
  });
}
