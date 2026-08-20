export type PresentationCommand =
  | { type: 'SHOW_SONG'; songId: number; sectionIndex?: number }
  | { type: 'SHOW_SLIDE'; songId: number; sectionIndex: number; slideIndex: number }
  | { type: 'SET_LIVE'; live: boolean }
