import type {
  CaseContent,
  CaseId,
  DesignNote,
  GlossaryEntry,
  Instrument,
  OrdinaryPatient,
  PatternData,
  SharedOverview,
  TourContent,
  TourPart,
  V5Content,
  Vocab,
} from './types';
import kari from './cases/kari.json';
import erlend from './cases/erlend.json';
import astrid from './cases/astrid.json';
import torbjorn from './cases/torbjorn.json';
import sofie from './cases/sofie.json';
import vocabJson from './vocab.json';
import instrumentJson from './instrument.json';
import tourJson from './tour.json';
import notesJson from './notes.json';
import glossaryJson from './glossary.json';
import patternJson from './pattern.json';
import sharedJson from './shared.json';
import v5Json from './v5.json';
import scheduleJson from './schedule.json';

// JSON imports widen string literals, so the files are cast to their types
// here; scripts/check-content.mjs validates them against the schema.
export const cases: Record<CaseId, CaseContent> = {
  kari: kari as unknown as CaseContent,
  erlend: erlend as unknown as CaseContent,
  astrid: astrid as unknown as CaseContent,
  torbjorn: torbjorn as unknown as CaseContent,
  sofie: sofie as unknown as CaseContent,
};

export const vocab = vocabJson as unknown as Vocab;
export const instrument = instrumentJson as unknown as Instrument;
export const tour = tourJson as unknown as TourContent;

/**
 * The tour's parts for a role. The participant's tour starts with «Slik foregår studien»; review mode, «Se igjen» and
 * the reasons on Takk show ATLAS's own parts only.
 */
export function tourParts(role: 'gp' | 'dps', withStudy = false): TourPart[] {
  return withStudy ? tour[role].parts : tour[role].parts.filter((p) => !p.studyOnly);
}
export const notes = notesJson as unknown as Record<string, DesignNote>;
export const glossary = glossaryJson as unknown as GlossaryEntry[];
export const pattern = patternJson as unknown as PatternData;
export const shared = sharedJson as unknown as SharedOverview;
export const v5 = v5Json as unknown as V5Content;
export const ordinary = (scheduleJson as unknown as { ordinary: OrdinaryPatient[] }).ordinary;
