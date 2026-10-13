// ATLAS design system feedback. Paste the Nettskjema link here when the form is ready.
// Until then the panel shows a built-in preview and stores answers in the browser (CSV export).
const config = {
  nettskjemaUrl: '', // e.g. 'https://nettskjema.no/a/123456'
  wrapupUrl: '', // optional separate form for the wrap-up; empty = same form
  version: '1.0',
  // Nettskjema codebook names for the pre-filled, locked text fields
  fields: { name: 'navn', role: 'rolle', page: 'side', section: 'seksjon', version: 'versjon' },
  roles: ['Fastlege', 'DPS-kliniker', 'Veileder', 'Ekstern fagperson'],
  sectionQuestions: [
    { id: 'klarhet', type: 'scale', nb: 'Hvor tydelig er denne delen?', en: 'How clear is this section?', min: 'Uklar', max: 'Svært tydelig' },
    { id: 'fungerer', type: 'text', nb: 'Hva fungerer godt?', en: 'What works well?' },
    { id: 'endre', type: 'text', nb: 'Hva bør endres?', en: 'What should change?' },
    { id: 'alvor', type: 'choice', nb: 'Hvor viktig er endringen?', en: 'How important is the change?', options: ['Må endres', 'Bør endres', 'Liten ting', 'Bare et forslag'] },
    { id: 'anbefaling', type: 'choice', nb: 'Leste du noe her som et råd om hva klinikeren skal gjøre?', en: 'Did anything here read as advice on what the clinician should do?', options: ['Ja', 'Nei', 'Usikker'] },
  ],
  wrapupQuestions: [
    { id: 'passer', type: 'scale', nb: 'Hvor godt passer designsystemet til en travel klinisk hverdag?', en: 'How well does the design system fit a busy clinical day?', min: 'Dårlig', max: 'Svært godt' },
    { id: 'viktigst', type: 'text', nb: 'Hva er det viktigste å endre?', en: 'What is the most important thing to change?' },
    { id: 'behold', type: 'text', nb: 'Hva bør være som det er?', en: 'What should stay as it is?' },
    { id: 'mangler', type: 'text', nb: 'Mangler det noe?', en: 'Is anything missing?' },
    { id: 'kontakt', type: 'choice', nb: 'Kan prosjektet kontakte deg for en kort oppfølging?', en: 'May the project contact you for a short follow-up?', options: ['Ja', 'Nei'] },
  ],
};
export default config;
