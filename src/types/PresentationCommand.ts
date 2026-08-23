export type PresentationCommand =
  | { type: 'LOAD_SONG'; songId: number }
  | { type: 'CLEAR_SONG' }
  | { type: 'SHOW_SLIDE'; songId: number; sectionIndex: number; slideIndex: number }
  | { type: 'SET_LIVE'; live: boolean }
