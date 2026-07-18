import Dexie, { type EntityTable } from 'dexie';
import { normalizeImportedText } from '../utils/SongFormatter';

export type SongIndex = {
  id: number;
  songNumber: number;
  title: string;
  artist?: string;
  language?: string;
  originalKey?: string;
  hashtags?: string[];
  searchTokens: string;
  isPersonal?: boolean;
  is_active?: boolean;
}

export type SongDetail = {
  id: number;
  songNumber: number;
  title: string;
  artist?: string;
  composer?: string;
  language?: string;
  originalKey?: string;
  capo?: number;
  bpm?: number;
  timeSignature?: string;
  hashtags?: string[];
  sections: Section[];
  chords?: string; // Raw chords text with markers like [G]
  display?: string; // Display text for presentation (replaces lyrics)
  is_active?: boolean; // Whether the song is active and visible in the app
  updated_at?: string; // Timestamp for delta sync
}

export type Section = {
  type: string;
  label: string;
  lines: Line[];
}

export type Line = {
  text: string;
  chords?: Chord[];
}

export type Chord = {
  chord: string;
  position: number;
}

export type Setlist = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  songs: SetlistItem[];
}

export type SetlistItem = {
  id: string; // Unique UUID for each item in the setlist
  type?: 'song' | 'marker' | 'note'; // defaults to 'song' if undefined
  songId?: number; // Only for 'song' type
  transpose?: number; // Only for 'song' type
  label?: string; // For 'marker' or 'note' title
  content?: string; // For 'note' text content
  order: number;
}

export type SyncMetadata = {
  id: string;
  version: string;
  generatedAt: string;
  songCount: number;
  lastSyncedAt: number;
}

export type ArrangementOverride = {
  capo?: number;
  sections?: Section[];
}

export type Arrangement = {
  id: string;
  songId: number;
  name: string;
  type: 'personal' | 'shared';
  overrides: ArrangementOverride;
  createdAt: number;
  updatedAt: number;
}

export type CacheEntry = {
  id: string;
  data: unknown;
  timestamp: number;
  size: number;
  cachedAt?: string;
}


export class WorshipDatabase extends Dexie {
  songs!: EntityTable<SongDetail, 'id'>;
  songIndex!: EntityTable<SongIndex, 'id'>;
  syncMeta!: EntityTable<SyncMetadata, 'id'>;
  setlists!: EntityTable<Setlist, 'id'>;
  arrangements!: EntityTable<Arrangement, 'id'>;
  cache!: EntityTable<CacheEntry, 'id'>;
  meta!: EntityTable<{ id: string; value: string | number }, 'id'>;

  sharedSongs!: EntityTable<SongDetail, 'id'>;
  sharedSetlists!: EntityTable<Setlist, 'id'>;

  personalSongs!: EntityTable<SongDetail, 'id'>;

  constructor() {
    super('WorshipRuntimeDatabase');
    this.version(7).stores({
      songs: 'id, songNumber, language, updated_at',
      songIndex: 'id, songNumber, title, language, searchTokens',
      syncMeta: 'id',
      setlists: 'id, title, updatedAt',
      arrangements: 'id, songId, type, updatedAt',
      cache: 'id, timestamp',
      meta: 'id',
      sharedSongs: 'id, songNumber, title, language',
      sharedSetlists: 'id, title, updatedAt',
      personalSongs: 'id, title, language'
    });
  }

  async resetCache() {
    return this.transaction('rw', [this.songs, this.songIndex, this.syncMeta, this.arrangements], async () => {
      await this.songs.clear();
      await this.songIndex.clear();
      await this.syncMeta.clear();
      await this.arrangements.clear();
    });
  }
}

export const db = new WorshipDatabase();

export async function getSongById(id: number): Promise<SongDetail | null> {
  let song = await db.songs.get(id);
  if (song) {
    // Use title AND originalKey from songIndex as source of truth
    // (song detail JSONs may be missing originalKey while the index has it)
    const indexEntry = await db.songIndex.get(id);
    if (indexEntry) {
      song.title = indexEntry.title;
      if (!song.originalKey && indexEntry.originalKey) {
        song.originalKey = indexEntry.originalKey;
      }
    }
    return normalizeSongDetail(song);
  }

  song = await db.sharedSongs.get(id);
  if (song) return normalizeSongDetail(song);

  // Fallback to Supabase if online (no JSON file reading)
  if (!navigator.onLine) {
    console.warn('⚠️ Offline: song not in IndexedDB and cannot reach Supabase.');
    return null;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client.from('songs').select('*').eq('id', id).single();
    if (error || !data) return null;
    const normalized = normalizeSongDetail({
      id: data.id,
      songNumber: data.song_number,
      title: data.title,
      artist: data.artist,
      composer: data.composer,
      language: data.language,
      originalKey: data.original_key,
      capo: data.capo,
      bpm: data.bpm,
      timeSignature: data.time_signature,
      hashtags: [],
      sections: [],
      chords: data.chords,
      display: data.display,
      is_active: data.is_active !== false,
      updated_at: data.updated_at
    });
    // Cache in IndexedDB for next time
    await db.songs.put(normalized);
    return normalized;
  } catch (e) {
    console.error('Failed to fetch song from Supabase:', e);
  }
  return null;
}

export function normalizeSongIndex(song: SongIndex): SongIndex {
  return {
    ...song,
    title: normalizeImportedText(song.title),
    artist: normalizeImportedText(song.artist),
    originalKey: normalizeImportedText(song.originalKey),
    searchTokens: normalizeImportedText(song.searchTokens),
  };
}

export function normalizeSongDetail(song: SongDetail): SongDetail {
  return {
    ...song,
    title: normalizeImportedText(song.title),
    artist: normalizeImportedText(song.artist),
    composer: normalizeImportedText(song.composer),
    originalKey: normalizeImportedText(song.originalKey),
    sections: song.sections?.map(section => ({
      ...section,
      label: normalizeImportedText(section.label),
      lines: section.lines?.map(line => ({
        ...line,
        text: normalizeImportedText(line.text),
        chords: line.chords?.map(chord => ({
          ...chord,
          chord: normalizeImportedText(chord.chord)
        }))
      })) || []
    })) || []
  };
}

export async function getSongIndexById(id: number): Promise<SongIndex | null> {
  const index = await db.songIndex.get(id);
  if (index) return index;

  const shared = await db.sharedSongs.get(id);
  if (shared) {
    return {
      id: shared.id,
      songNumber: shared.songNumber,
      title: normalizeImportedText(shared.title),
      artist: normalizeImportedText(shared.artist),
      language: shared.language,
      originalKey: normalizeImportedText(shared.originalKey),
      hashtags: shared.hashtags,
      searchTokens: ''
    };
  }

  const personal = await db.personalSongs.get(id);
  if (personal) {
    return {
      id: personal.id,
      songNumber: personal.songNumber,
      title: normalizeImportedText(personal.title),
      artist: normalizeImportedText(personal.artist),
      language: personal.language,
      originalKey: normalizeImportedText(personal.originalKey),
      hashtags: personal.hashtags,
      searchTokens: '',
      isPersonal: true
    };
  }

  return null;
}

/**
 * Emergency reset utility. Clears EVERYTHING including setlists.
 */
export async function fullSystemReset() {
  await db.delete();
  window.location.reload();
}

export async function needsInitialDownload(): Promise<boolean> {
  console.log('Database helper START');
  try {
    const count = await db.songIndex.count();
    console.log('Database helper END');
    console.log('Song count:', count);
    console.log('Database empty:', count === 0 ? 'true' : 'false');
    return count === 0;
  } catch (error) {
    console.log('Database helper END');
    console.error('Database helper error:', error);
    throw error;
  }
}
