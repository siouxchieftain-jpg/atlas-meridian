import { describe, expect, it } from 'vitest';
import { CRITERIA_ORDER, SECTION_CRITERIA, mentionedCriteria, referralCriteria, sectionStatus } from '../../src/engine/criteria';
import { R5_CROSS, R5_DURATION, R5_FUNCTION, R5_RISK, R5_SEVERITY, R5_WITHIN } from './criteria-phrases-r5';
import {
  R6_DURATION,
  R6_DURATION_NOT,
  R6_FUNCTION,
  R6_FUNCTION_NOT,
  R6_FUNCTION_OFF_TOPIC,
  R6_RISK,
  R6_RISK_NOT,
  R6_SEVERITY,
  R6_SEVERITY_NOT,
  R6_WRONG,
} from './criteria-phrases-r6';
import { DURATION, FUNCTION, MUST_NOT, RISK, SEVERITY } from './criteria-phrases';
import {
  FINAL,
  FINAL5,
  FINAL5_AKT,
  FINAL5_AKT_ERRORS,
  FINAL5_ERRORS,
  FINAL6,
  FINAL6_AKT,
  FINAL6_AKT_ERRORS,
  FINAL6_ERRORS,
  FINAL7,
  FINAL7_AKT,
  FINAL7_AKT_ERRORS,
  FINAL7_ERRORS,
  FINAL_ERRORS,
  HELD_OUT,
  R7,
  R8,
  R8_AKT,
  R8_KNOWN,
  R9F,
  R9F_AKT,
  R9F_KNOWN,
  R10F,
  R10F_AKT,
} from './criteria-phrases-r7';
import { cases } from '../../src/content';
import tour from '../../src/content/tour.json';
import notes from '../../src/content/notes.json';

describe('Informasjonsguiden', () => {
  it('finds all five criteria in Torbjørn’s note, in both languages (CV-02)', () => {
    const note = cases.torbjorn.gp.note.text;
    expect(mentionedCriteria(note.nb)).toEqual(CRITERIA_ORDER);
    expect(mentionedCriteria(note.en)).toEqual(CRITERIA_ORDER);
  });

  it('reads psychotic symptoms as severity', () => {
    expect(mentionedCriteria('Hører stemmer og har usammenhengende tale.')).toContain('alvorlighet');
    expect(mentionedCriteria('Has delusions and hears voices.')).toContain('alvorlighet');
  });

  it('finds nothing in an empty text', () => {
    expect(mentionedCriteria('')).toEqual([]);
  });
});

describe('the margin status per referral section', () => {
  it('says mentioned, partly mentioned or not mentioned yet', () => {
    expect(sectionStatus('aktuelt', 'Nedstemt i fire måneder. PHQ-9 14.')).toBe('mentioned');
    expect(sectionStatus('aktuelt', 'PHQ-9 14.')).toBe('partlyMentioned');
    expect(sectionStatus('aktuelt', '')).toBe('notMentionedYet');
    expect(sectionStatus('risiko', 'Ingen selvmordstanker.')).toBe('mentioned');
    expect(sectionStatus('funksjon', '')).toBe('notMentionedYet');
  });

  it('gives no status to «Spørsmål til DPS», which has no criterion', () => {
    expect(sectionStatus('sporsmal', 'Ønsker vurdering.')).toBeNull();
  });
});

describe('the guide reads clinical wording, not only keywords (R2V-01, R2GP-02)', () => {
  it('reads function written in a clinician’s or a patient’s own words', () => {
    for (const text of [
      'I full stilling. Har sluttet å trene og orker mindre sammen med familien om kveldene.',
      '100 % sykmeldt i seks uker.',
      'Klarer ikke å handle eller kjøre bil på grunn av panikkanfall. Holder seg mest hjemme.',
      'Delvis, flere fraværsdager.',
      'Has stopped exercising and has less energy for her family.',
      'Cannot go shopping or drive because of panic attacks. Mostly stays at home.',
    ]) expect(sectionStatus('funksjon', text), text).toBe('mentioned');
  });

  it('reads risk written in a clinician’s own words', () => {
    for (const text of [
      'Ingen tanker om å skade seg selv eller ta sitt eget liv.',
      'Ingen fare for vold.',
      'No thoughts of harming herself or taking her own life.',
    ]) expect(sectionStatus('risiko', text), text).toBe('mentioned');
  });

  it('every filled section of a scripted or note-derived referral reads as mentioned', () => {
    for (const [id, c] of Object.entries(cases)) {
      for (const lang of ['nb', 'en'] as const) {
        const draft = (c.gp.referralDraft ?? {}) as Record<string, { text: { nb: string; en: string } }>;
        for (const [sec, v] of Object.entries(draft)) {
          if (sec === 'sporsmal' || !v.text[lang].trim()) continue;
          expect(sectionStatus(sec as never, v.text[lang]), `${id} draft ${sec} ${lang}`).toBe('mentioned');
        }
        for (const [sec, v] of Object.entries(c.dps?.referral.sections ?? {})) {
          if (sec === 'sporsmal' || !v[lang].trim()) continue;
          expect(sectionStatus(sec as never, v[lang]), `${id} dps ${sec} ${lang}`).toBe('mentioned');
        }
      }
    }
  });

  it('keeps what the readings say a note does not mention (Erlend: function; Kari: risk)', () => {
    for (const lang of ['nb', 'en'] as const) {
      expect(mentionedCriteria(cases.erlend.gp.note.text[lang])).not.toContain('funksjon');
      expect(mentionedCriteria(cases.kari.gp.note.text[lang])).not.toContain('risiko');
    }
  });
});

describe('the guide reads common clinical phrasing, in both languages (R3F-01)', () => {
  it('reads risk however a clinician writes it', () => {
    for (const text of [
      'Ingen tanker om å ta livet sitt. Ikke livstrett.',
      'Ingen planer om å ta livet av seg.',
      'Ingen tanker om å ta sitt eget liv.',
      'Ingen livstretthet.',
      'Passive dødsønsker, ingen planer.',
      'Ønsker ikke å dø.',
      'Skader seg ikke.',
      'Har kuttet seg tidligere.',
      'Overdose for to år siden.',
      'Ingen akutt fare.',
      'Har truet med vold mot naboen.',
      'Kriseplan er laget sammen med pasienten.',
      'No self harm.',
      'No thoughts of ending her life.',
      'No plans to kill himself.',
      'Has cut herself in the past.',
      'Passive death wish, no plans.',
      'Took an overdose two years ago.',
      'No acute danger.',
      'Tired of life at times.',
    ]) expect(sectionStatus('risiko', text), text).toBe('mentioned');
  });

  it('reads function however a clinician or a patient writes it', () => {
    for (const text of [
      'Fungerer dårlig.',
      'Går nesten ikke ut av huset og greier ikke å ta vare på barna.',
      'Kommer seg nesten ikke ut.',
      'Har mistet kontakten med vennene sine.',
      'Har sluttet på skolen.',
      'Mottar uføretrygd.',
      'Er på AAP.',
      'Unngår butikker og kollektivtransport.',
      'Ligger til sengs det meste av dagen.',
      'Tilbaketrukket.',
      'Can’t leave the house.',
      "Can't leave the house.",
      'Struggles to care for her children.',
      'Stopped going to school.',
      'Not coping.',
      'Avoids crowded places.',
      'Housebound for weeks.',
      'Receives a work assessment allowance.',
    ]) expect(sectionStatus('funksjon', text), text).toBe('mentioned');
  });

  it('does not read function into words that belong to other sections', () => {
    for (const text of [
      'Ønsker å behandle angsten.',
      'Vrangforestillinger og hallusinasjoner.',
      'Avvenning fra benzodiazepiner.',
      'Sertralin 50 mg daglig.',
      'For å unngå bivirkninger.',
      'Sertraline 50 mg daily.',
      'Did not benefit from therapy.',
      'Took sertraline to avoid relapse.',
    ]) expect(mentionedCriteria(text), text).not.toContain('funksjon');
  });

  it('does not read risk into everyday phrases', () => {
    for (const text of ['Prøver å ta livet med ro.', 'Lever sitt eget liv.', 'Moren døde i fjor.', 'Har kuttet ned på kaffe.', 'Lives her own life.', 'Takes life one day at a time.']) {
      expect(mentionedCriteria(text), text).not.toContain('risiko');
    }
  });

  it('reads «depresjon» as severity', () => {
    expect(mentionedCriteria('Moderat depresjon.')).toContain('alvorlighet');
    expect(mentionedCriteria('Depresjon.')).toContain('alvorlighet');
  });
});

describe('duration is read as a word, not inside «får» or «går» (R3F-05)', () => {
  it('reads duration in years, weeks, months and days', () => {
    for (const text of ['Nedstemt i to år.', 'Nedstemt i tre uker.', 'Nedstemt siden jul.', 'Har vart i ti dager.', 'Low mood for six weeks.', 'Low mood for two years.']) {
      expect(mentionedCriteria(text), text).toContain('varighet');
    }
  });

  it('does not read duration into other words', () => {
    for (const text of [
      'Nedstemt og får ikke sove.',
      'Går tur hver dag.',
      '34 år gammel kvinne med nedstemthet.',
      'Bruker sertralin.',
      'A 34-year-old woman with low mood.',
      'Low mood at the weekend.',
    ]) expect(mentionedCriteria(text), text).not.toContain('varighet');
    expect(sectionStatus('aktuelt', 'Nedstemt og får ikke sove.')).toBe('partlyMentioned');
    expect(sectionStatus('aktuelt', 'Nedstemt og engstelig.')).toBe('partlyMentioned');
  });
});


describe('the guide reads clinicians’ own phrasing (r4F-01)', () => {
  it('reads risk in the risk section, in both languages', () => {
    for (const [lang, text] of RISK) expect(sectionStatus('risiko', text), `${lang}: ${text}`).toBe('mentioned');
  });
  it('reads function in the function section, in both languages', () => {
    for (const [lang, text] of FUNCTION) expect(sectionStatus('funksjon', text), `${lang}: ${text}`).toBe('mentioned');
  });
  it('reads duration in «Aktuelt», in both languages', () => {
    for (const [lang, text] of DURATION) expect(sectionStatus('aktuelt', text), `${lang}: ${text}`).toBe('mentioned');
  });
  it('reads severity in «Aktuelt», in both languages', () => {
    for (const [lang, text] of SEVERITY) expect(sectionStatus('aktuelt', text), `${lang}: ${text}`).toBe('mentioned');
  });
});

describe('a referral is read section by section, so the count and the margins agree (r4F-02)', () => {
  it('never counts a criterion from words in another section', () => {
    for (const [lang, sec, text, not] of MUST_NOT) {
      expect(referralCriteria({ [sec]: text }), `${lang} ${sec}: ${text}`).not.toContain(not);
    }
  });

  it('does not read bounded words as the criterion, also in a note', () => {
    const wholeText: [string, string][] = [
      ['Panikkanfall med frykt for å dø, i åtte måneder.', 'risiko'],
      ['Voldsomt sliten og nedstemt i fire måneder.', 'risiko'],
      ['Skadet seg i kneet i fjor, sykmeldt.', 'risiko'],
      ['Sertralin med ufarlige bivirkninger.', 'risiko'],
      ['Takes brisk walks daily.', 'risiko'],
      ['Normal stoffskiftefunksjon.', 'funksjon'],
      ['Godt samarbeid med psykolog.', 'funksjon'],
      ['Oppfølging med hjemmebesøk fra kommunen.', 'funksjon'],
      ['Utarbeidet kriseplan.', 'funksjon'],
      ['Thyroid function normal.', 'funksjon'],
      ['Si fra hvis det blir verre.', 'risiko'],
    ];
    for (const [text, not] of wholeText) expect(mentionedCriteria(text), text).not.toContain(not);
    for (const [lang, sec, text, not] of MUST_NOT) {
      if (sec === 'aktuelt' && not === 'varighet') expect(sectionStatus('aktuelt', text), `${lang}: ${text}`).not.toBe('mentioned');
    }
  });

  it('counts each criterion only in its own section', () => {
    expect(
      referralCriteria({
        aktuelt: 'Nedstemt i fire måneder. Sosial angst.',
        tidligere: 'Depresjon i familien. Jobbet med eksponering i terapi.',
        funksjon: '',
        risiko: '',
      }),
    ).toEqual(['alvorlighet', 'varighet', 'behandling']);
    expect(referralCriteria({ funksjon: 'Går lite ut.', risiko: 'Ingen suicidale tanker.' })).toEqual(['funksjon', 'risiko']);
    expect(referralCriteria({})).toEqual([]);
  });

  it('reads every scripted referral as complete, as the received guides say', () => {
    for (const [id, c] of Object.entries(cases)) {
      if (!c.dps) continue;
      for (const lang of ['nb', 'en'] as const) {
        const sections = Object.fromEntries(Object.entries(c.dps.referral.sections).map(([k, v]) => [k, v[lang]]));
        expect(referralCriteria(sections), `${id} ${lang}`).toEqual(c.dps.guideAsReceived);
      }
    }
  });
});

describe('the guide reads the round-5 reviewer’s fresh phrasing, and what is not assessed does not count (r5F-01, r5F-02)', () => {
  it('reads risk, function, duration and severity in their own sections', () => {
    for (const [lang, text] of R5_RISK) expect(sectionStatus('risiko', text), `${lang}: ${text}`).toBe('mentioned');
    for (const [lang, text] of R5_FUNCTION) expect(sectionStatus('funksjon', text), `${lang}: ${text}`).toBe('mentioned');
    for (const [lang, text] of R5_DURATION) {
      const anchored = `${lang === 'nb' ? 'Nedstemt.' : 'Low mood.'} ${text}`;
      expect(sectionStatus('aktuelt', anchored), `${lang}: ${anchored}`).toBe('mentioned');
    }
    for (const [lang, text] of R5_SEVERITY) expect(mentionedCriteria(text), `${lang}: ${text}`).toContain('alvorlighet');
  });

  it('never reads a criterion from another section', () => {
    for (const [lang, sec, text, watch] of R5_CROSS) {
      const read = referralCriteria({ [sec]: text });
      for (const w of watch) {
        for (const c of SECTION_CRITERIA[w as keyof typeof SECTION_CRITERIA]) expect(read, `${lang} ${sec} → ${w}: ${text}`).not.toContain(c);
      }
    }
  });

  it('does not count a section that says it was not assessed, or words that are about something else', () => {
    for (const [lang, sec, text] of R5_WITHIN) {
      // Round 6: what is written in a section with one criterion counts (r6F-01), so this sentence in
      // «Risikovurdering» reads as «Omtalt»; accepted and logged in G-06.
      if (text === 'Livet har vært tøft etter skilsmissen.') continue;
      if (sec === 'aktuelt' && /^(Nedstemt|Low mood)/.test(text)) expect(mentionedCriteria(text), `${lang}: ${text}`).not.toContain('varighet');
      else expect(sectionStatus(sec as 'risiko', text), `${lang} ${sec}: ${text}`).toBe('notMentionedYet');
    }
    // An assessment that something is not the case still counts.
    expect(sectionStatus('risiko', 'Ikke vurdert som suicidal.')).toBe('mentioned');
    expect(sectionStatus('risiko', 'Risiko ikke vurdert. Ingen suicidale tanker.')).toBe('mentioned');
  });
});

describe('a section with one criterion counts what is written in it, unless it says the criterion was not assessed (r6F-01, r6F-03)', () => {
  const anchor = (lang: 'nb' | 'en', text: string) => `${lang === 'nb' ? 'Nedstemt.' : 'Low mood.'} ${text}`;

  it('reads the round-6 reviewer’s risk and function, grave warning signs included, in their own sections', () => {
    for (const [lang, text] of R6_RISK) expect(sectionStatus('risiko', text), `${lang}: ${text}`).toBe('mentioned');
    for (const [lang, text] of R6_FUNCTION) expect(sectionStatus('funksjon', text), `${lang}: ${text}`).toBe('mentioned');
    expect(sectionStatus('risiko', 'Har kjøpt tau og skrevet brev til familien. Ser ingen utvei.')).toBe('mentioned');
    expect(sectionStatus('risiko', 'Sees no way out.')).toBe('mentioned');
  });

  it('reads the round-6 reviewer’s duration and severity in «Aktuelt»', () => {
    for (const [lang, text] of R6_DURATION) expect(mentionedCriteria(anchor(lang, text)), `${lang}: ${text}`).toContain('varighet');
    for (const [lang, text] of R6_SEVERITY) expect(mentionedCriteria(text), `${lang}: ${text}`).toContain('alvorlighet');
  });

  it('gives no credit for what was not assessed, is unknown, is left to DPS, or is a risk to something other than life and health', () => {
    for (const [lang, text] of R6_RISK_NOT) expect(sectionStatus('risiko', text), `${lang}: ${text}`).toBe('notMentionedYet');
    for (const [lang, text] of R6_FUNCTION_NOT) expect(sectionStatus('funksjon', text), `${lang}: ${text}`).toBe('notMentionedYet');
    for (const text of ['-', '?', 'x', 'Se notat.', 'Som over.', 'See attached.', 'Ingen opplysninger.', 'Risiko:', 'Ikke gjort.', 'Pending.']) {
      expect(sectionStatus('risiko', text), text).toBe('notMentionedYet');
      expect(sectionStatus('tidligere', text), text).toBe('notMentionedYet');
    }
    // Kari's empty Risikovurdering: a statement that risk was not assessed leaves the count where it was.
    expect(referralCriteria({ risiko: 'Ikke gjort suicidalvurdering i dag.' })).toEqual([]);
    expect(referralCriteria({ risiko: 'Suicide risk not yet assessed.' })).toEqual([]);
  });

  it('still counts an assessment, a negative finding and what follows «men» after what was not asked', () => {
    for (const text of [
      'Ikke vurdert som suicidal.',
      'Ikke spurt direkte, men ingen tegn til suicidalitet.',
      'Suicidalitet: neg.',
      'Ingen kjent voldshistorikk.',
      'Ikke kjent med selvskading.',
      'Risiko kan vurderes som lav.',
      'Selvmordsrisiko må vurderes som moderat.',
      'Not asked directly, but no signs of suicidality.',
      'Not known to self-harm.',
      'Risk of losing control when intoxicated.',
    ]) expect(sectionStatus('risiko', text), text).toBe('mentioned');
    for (const text of ['Ingen tidligere behandling.', 'Har ikke tatt medisinene.', 'No previous treatment.']) expect(sectionStatus('tidligere', text), text).toBe('mentioned');
  });

  it('counts what is written about someone else in a section with one criterion (accepted, G-06)', () => {
    for (const [lang, text] of R6_FUNCTION_OFF_TOPIC) expect(sectionStatus('funksjon', text), `${lang}: ${text}`).toBe('mentioned');
  });

  it('reads no duration from an age, a stay, a marriage, a job or an appointment, and no severity from a relative', () => {
    for (const [lang, text] of R6_DURATION_NOT) expect(mentionedCriteria(anchor(lang, text)), `${lang}: ${text}`).not.toContain('varighet');
    for (const [lang, text] of R6_SEVERITY_NOT) expect(mentionedCriteria(text), `${lang}: ${text}`).not.toContain('alvorlighet');
    // A time beside a symptom is the symptom's duration, whatever else the sentence names.
    expect(mentionedCriteria('Plaget med angst siden hun begynte å jobbe for fem år siden.')).toContain('varighet');
    expect(mentionedCriteria('Nedstemt etter at mor døde.')).toContain('alvorlighet');
  });

  it('never reads a criterion from another section', () => {
    for (const [lang, sec, text, crit] of R6_WRONG) expect(referralCriteria({ [sec]: text }), `${lang} ${sec}: ${text}`).not.toContain(crit);
  });
});

describe('a section with one criterion: what says nothing about it does not count, what says something does (r7F-01, r7F-05)', () => {
  it('reads the round-7 reviewer’s phrasings as written', () => {
    for (const o of R7) {
      const label = `${o.id} ${o.text}`;
      if (o.kind === 'wrong') expect(referralCriteria({ [o.section]: o.text }), label).not.toContain(o.crit);
      else if (o.section === 'aktuelt') {
        const text = o.crit === 'varighet' ? `${o.lang === 'nb' ? 'Nedstemt.' : 'Low mood.'} ${o.text}` : o.text;
        expect(mentionedCriteria(text).includes(o.crit), label).toBe(o.kind === 'pos');
      } else expect(sectionStatus(o.section, o.text) === 'mentioned', label).toBe(o.kind === 'pos');
    }
  });

  it('reads the three held-out sets it was corrected on as labelled', () => {
    for (const o of HELD_OUT) expect(sectionStatus(o.section, o.text) === 'mentioned', `set ${o.set} ${o.lang}: ${o.text}`).toBe(o.label === 1);
  });

  it('does no worse on the final held-out set than when it was measured (G-06)', () => {
    const wrong = FINAL.filter((o) => (sectionStatus(o.section, o.text) === 'mentioned') !== (o.label === 1));
    expect(wrong.length).toBeLessThanOrEqual(FINAL_ERRORS);
  });

  it('does no worse on the fifth, sixth and seventh held-out sets than when they were measured (G-06, rounds 9 to 11)', () => {
    for (const [set, akt, bound, aktBound] of [
      [FINAL5, FINAL5_AKT, FINAL5_ERRORS, FINAL5_AKT_ERRORS],
      [FINAL6, FINAL6_AKT, FINAL6_ERRORS, FINAL6_AKT_ERRORS],
      [FINAL7, FINAL7_AKT, FINAL7_ERRORS, FINAL7_AKT_ERRORS],
    ] as const) {
      const wrong = set.filter((o) => (sectionStatus(o.section, o.text) === 'mentioned') !== (o.label === 1));
      expect(wrong.length).toBeLessThanOrEqual(bound);
      let n = 0;
      for (const o of akt) {
        const m = mentionedCriteria(o.text);
        if (m.includes('alvorlighet') !== (o.severity === 1)) n++;
        if (m.includes('varighet') !== (o.duration === 1)) n++;
      }
      expect(n).toBeLessThanOrEqual(aktBound);
    }
  });

  it('reads the round-8 reviewer’s phrasings as labelled, but for the three it reads otherwise by design (r8F-04, r8F-05)', () => {
    for (const o of R8) {
      if (R8_KNOWN.has(o.text)) continue;
      expect(sectionStatus(o.section, o.text) === 'mentioned', `${o.lang} ${o.section}: ${o.text}`).toBe(o.label === 1);
    }
    for (const o of R8_AKT) {
      if (R8_KNOWN.has(o.text)) continue;
      const m = mentionedCriteria(o.text);
      if (o.severity !== null) expect(m.includes('alvorlighet'), `severity ${o.lang}: ${o.text}`).toBe(o.severity === 1);
      if (o.duration !== null) expect(m.includes('varighet'), `duration ${o.lang}: ${o.text}`).toBe(o.duration === 1);
    }
  });

  it('reads the round-9 reviewer’s phrasings as labelled, but for the three it reads otherwise (r9F-02, r9F-03)', () => {
    for (const o of R9F) {
      if (R9F_KNOWN.has(o.text)) continue;
      expect(sectionStatus(o.section, o.text) === 'mentioned', `${o.lang} ${o.section}: ${o.text}`).toBe(o.label === 1);
    }
    for (const o of R9F_AKT) {
      const m = mentionedCriteria(o.text);
      if (o.severity !== null) expect(m.includes('alvorlighet'), `severity ${o.lang}: ${o.text}`).toBe(o.severity === 1);
      if (o.duration !== null) expect(m.includes('varighet'), `duration ${o.lang}: ${o.text}`).toBe(o.duration === 1);
    }
  });

  it('reads the round-10 reviewer’s phrasings as labelled (r10F-01, r10F-03)', () => {
    for (const o of R10F) expect(sectionStatus(o.section, o.text) === 'mentioned', `${o.lang} ${o.section}: ${o.text}`).toBe(o.label === 1);
    for (const o of R10F_AKT) {
      const m = mentionedCriteria(o.text);
      if (o.severity !== null) expect(m.includes('alvorlighet'), `severity ${o.lang}: ${o.text}`).toBe(o.severity === 1);
      if (o.duration !== null) expect(m.includes('varighet'), `duration ${o.lang}: ${o.text}`).toBe(o.duration === 1);
    }
  });

  it('reads the standard formula «fare for eget eller andres liv» as a risk to life, and a risk to a job or a home as something else (r10F-01)', () => {
    for (const text of [
      'Ingen holdepunkter for akutt fare for eget eller andres liv.',
      'Ingen fare for eget eller andres liv.',
      'Ingen holdepunkter for fare for eget eller andres liv eller helse.',
      'Ikke til fare for andres liv og helse.',
      'Ingen fare for eget eller andres liv og helse.',
      'Vurderes ikke å være til fare for eget eller andres liv.',
      'Ikke akutt fare for eget eller andres liv eller helse.',
      'Ingen fare for andres liv.',
      'Ingen fare for eget liv.',
      'Lav risiko for eget og andres liv.',
      'No evidence of acute danger to own or others’ lives.',
      'No risk to self or others.',
    ])
      expect(sectionStatus('risiko', text), text).toBe('mentioned');
    for (const text of ['Står i fare for å miste jobben og leiligheten.', 'Risiko for å miste førerkortet.', 'At risk of losing the flat.'])
      expect(sectionStatus('risiko', text), text).toBe('notMentionedYet');
  });

  it('reads «Spurte ikke om …» as not asked, and under «Tidligere behandling» an illness named alone as no treatment (r10F-03)', () => {
    expect(sectionStatus('risiko', 'Spurte ikke om selvmordstanker, hun var for urolig.')).toBe('notMentionedYet');
    expect(sectionStatus('risiko', 'Spurte om selvmordstanker, og hun avkrefter dette.')).toBe('mentioned');
    for (const text of ['Alvorlig depresjon uten psykotiske symptomer.', 'Severe depression without psychotic features.', 'Får insulin for diabetesen.', 'Operert for lyskebrokk i 2020.'])
      expect(sectionStatus('tidligere', text), text).toBe('notMentionedYet');
    for (const text of ['Hadde en alvorlig depresjon i 2018, fikk samtaler hos psykolog.', 'Deltok på kurs i depresjonsmestring i fjor.', 'Did a coping-with-depression course last year.', 'Alvorlig depresjon. Gikk hos helsesøster på skolen.'])
      expect(sectionStatus('tidligere', text), text).toBe('mentioned');
    // «Avkrefter» holds the letters of «kreft», and is no somatic illness.
    expect(sectionStatus('risiko', 'Avkrefter tanker om å gi opp livet.')).toBe('mentioned');
  });

  it('in «Aktuelt», doubt about severity is no severity, and how often is no duration (r10F-03)', () => {
    for (const text of ['Usikker på når dette startet, og hvor alvorlig det er.', 'Varighet og alvorlighetsgrad ukjent.', 'How severe this is, you will have to judge.'])
      expect(mentionedCriteria(text).includes('alvorlighet'), text).toBe(false);
    for (const text of ['Varighet og alvorlighetsgrad ukjent.', 'Duration and severity unknown.', 'Var på ferie i Spania i to uker i sommer.', 'Panikkanfall flere ganger i uka.'])
      expect(mentionedCriteria(text).includes('varighet'), text).toBe(false);
    for (const text of ['Sterk uro og søvnløshet den siste uka.', 'It’s been going on a couple of years.', 'Began in her twenties, comes back in episodes.'])
      expect(mentionedCriteria(text).includes('varighet'), text).toBe(true);
  });

  it('under «Tidligere behandling», a plan, this referral or treatment of a somatic illness is not mental health care given (r9F-02)', () => {
    for (const text of ['Planlegger å starte sertralin.', 'Plan to start sertraline.', 'Henvises for behandling.', 'Referred for treatment.', 'Tidligere behandlet for høyt blodtrykk og astma.', 'Treated for prostate cancer in 2023.'])
      expect(sectionStatus('tidligere', text), text).toBe('notMentionedYet');
    for (const text of ['Har prøvd sertralin tidligere, og skal starte på nytt.', 'Behandlet for depresjon og astma i 2019.', 'Referred to CAMHS in 2015, seen for two years.'])
      expect(sectionStatus('tidligere', text), text).toBe('mentioned');
  });

  it('reads «i fare» and "at risk" as a risk to life unless something else is named, and a written plan past a denial (r8F-04)', () => {
    for (const text of ['Ikke i fare.', 'Vurderes ikke å være i fare.', 'Not at risk.', 'Not felt to be at risk.', 'Mener selv hun ikke er i fare, men har skrevet ned hvordan hun vil gjøre det.', 'Ikke spurt direkte, men hun har skrevet ned hvordan hun vil gjøre det.', 'Pas. er usikker på om livet har noen mening lenger.', 'Not sure he is being honest when he denies suicidal thoughts; he previously concealed an attempt.'])
      expect(sectionStatus('risiko', text), text).toBe('mentioned');
    for (const text of ['Står i fare for å miste jobben.', 'At risk of losing his job.', 'Haven’t done a suicide risk assessment.', 'Would ask that DPS carry out a thorough suicide risk assessment.', 'Står i journalen.', 'Skriv inn', 'Enter text'])
      expect(sectionStatus('risiko', text), text).toBe('notMentionedYet');
  });

  it('takes a placeholder with words in it as «not assessed», so nothing else written beside it counts', () => {
    expect(sectionStatus('funksjon', 'Ikke vurdert, timen handlet mest om medisinering.')).toBe('notMentionedYet');
    expect(sectionStatus('funksjon', 'Not sure, to be honest.')).toBe('notMentionedYet');
    expect(sectionStatus('risiko', '<fyll inn>')).toBe('notMentionedYet');
    // A finding still counts beside it.
    expect(sectionStatus('funksjon', 'Ukjent. Hun er sykmeldt.')).toBe('mentioned');
  });

  it('under risk, takes a job, money or a home, or everyday symptoms, as something else, unless a safety word is in the same clause', () => {
    for (const text of ['Betydelig gjeld, namsmannen er koblet inn.', 'Plaget med søvnvansker og konsentrasjonsproblemer.', 'Significant debts, bailiffs now involved.', 'Landlord has threatened to terminate the tenancy.'])
      expect(sectionStatus('risiko', text), text).toBe('notMentionedYet');
    for (const text of ['Moderat risiko.', 'Moderate risk.', 'Livstrett etter at hun mistet jobben.', 'Paranoid about the neighbours and has said he will deal with them himself.', 'Drinking more than before and lives alone.'])
      expect(sectionStatus('risiko', text), text).toBe('mentioned');
  });

  it('under risk, doubt about a risk that is there is a judgement of it', () => {
    expect(sectionStatus('risiko', 'Usikker på om hun klarer å motstå trangen til å skade seg.')).toBe('mentioned');
    expect(sectionStatus('risiko', 'Usikker på om hun har selvmordstanker.')).toBe('notMentionedYet');
  });

  it('in «Tidligere behandling», that there was none is a finding, and a question states nothing', () => {
    for (const text of ['Aldri vært i behandling.', 'Never been assessed by mental health services.', 'Ikke tidligere kjent i psykisk helsevern.'])
      expect(sectionStatus('tidligere', text), text).toBe('mentioned');
    for (const text of ['Om hun har gått til psykolog tidligere, vet jeg ikke.', 'Whether he has seen a psychologist before, I could not say.', 'Previous therapy?'])
      expect(sectionStatus('tidligere', text), text).toBe('notMentionedYet');
  });
});

describe('the screens promise no more than the reader does (r7F-01, r7F-07)', () => {
  it('say that the guide tries to skip what was not assessed and can still count it, in the tour and the design note', () => {
    const margin = tour.gp.parts[2].steps[2].body;
    const note = notes.informasjonsguiden.text;
    for (const t of [margin, note]) {
      expect(t.nb).toContain('prøver å hoppe over');
      expect(t.nb).toContain('men kan likevel telle dem');
      expect(t.en).toContain('tries to skip');
      expect(t.en).toContain('can still count them');
      expect(t.nb).not.toContain('men ikke at noe ikke er vurdert');
    }
    expect(tour.gp.parts[1].steps[3].reason.en).toContain('what it finds mentioned');
  });
});
