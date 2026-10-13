import { createContext, useContext } from 'react';

/**
 * Merknader (review mode): the design notes on the current screen. Each
 * DesignNote that shows registers the part it sits in; the drawer lists the
 * notes in the order the parts come on the screen, and the markers carry the
 * same numbers.
 */
export interface NoteEntry {
  id: string;
  /** The part the note explains: the element the note sits in. */
  el: HTMLElement;
}

export interface NotesApi {
  /** Merknader is on (review.state.notes). */
  on: boolean;
  /** The notes on this screen, in the order their parts come. */
  entries: NoteEntry[];
  selected: string | null;
  /** Choose a note: its part is ringed and brought into view. `focusDrawer` moves focus to it in the drawer. */
  select: (id: string | null, opts?: { focusDrawer?: boolean; scroll?: boolean }) => void;
  register: (id: string, el: HTMLElement) => () => void;
}

export const NotesContext = createContext<NotesApi | null>(null);

/** Null outside review mode: notes never show in the study. */
export function useNotes(): NotesApi | null {
  return useContext(NotesContext);
}
