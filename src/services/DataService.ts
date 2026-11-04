import { db, normalizeSongIndex } from '../db/Database';
import type { SongDetail, SongIndex } from '../db/Database';
import { SearchEngine } from '../utils/SearchEngine';

const CATALOG_SYNC_ID = 'song-catalog';
const EXPORTS_BASE_URL = '/exports';

type SyncTrigger = 'app-start' | 'online-event' | 'manual';

interface ExportManifest {
  version: string | number;
  generatedAt: string;
  songCount: number;
}

interface ExportIndex {
  songs: SongIndex[];
}

let catalogSyncPromise: Promise<'completed' | 'skipped' | 'error'> | null = null;

async function fetchExport<T>(path: string): Promise<T> {
  const response = await fetch(`${EXPORTS_BASE_URL}/${path}`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function parseDisplayToSections(display: string): SongDetail['sections'] {
  const sections: SongDetail['sections'] = [];
  let current: SongDetail['sections'][number] | null = null;

  for (const line of display.split('\n')) {
    const text = line.trim();
    if (!text) continue;

    const marker = text.match(/^\[([^\]]+)\]$/);
    if (marker) {
      if (current) sections.push(current);
      current = { type: 'verse', label: marker[1], lines: [] };
    } else {
      if (!current) current = { type: 'verse', label: 'Verse 1', lines: [] };
      current.lines.push({ text });
    }
  }

  if (current) sections.push(current);
  return sections;
}

interface SyncResult {
  success: boolean;
  changedSongs: number;
  updatedSongs: number;
  insertedSongs: number;
  deletedSongs: number;
  verificationPassed: boolean;
  duration: number;
  errors: string[];
}

/**
 * Batched Download - Downloads all songs in batches with progress callback
 * This is triggered only when user explicitly clicks download button
 */
export async function batchDownloadSongs(
  onProgress?: (percent: number, message: string) => void
): Promise<'completed' | 'skipped' | 'error'> {
  if (catalogSyncPromise) return catalogSyncPromise;

  catalogSyncPromise = (async () => {
    try {
      onProgress?.(5, 'Checking song catalog...');
      const manifest = await fetchExport<ExportManifest>('manifest.json');
      if (!manifest.songCount || !manifest.version || !manifest.generatedAt) {
        throw new Error('Song catalog manifest is invalid.');
      }

      const [localMeta, localSongCount, localIndexCount] = await Promise.all([
        db.syncMeta.get(CATALOG_SYNC_ID),
        db.songs.count(),
        db.songIndex.count(),
      ]);
      if (
        localMeta?.version === String(manifest.version) &&
        localSongCount === manifest.songCount &&
        localIndexCount === manifest.songCount
      ) {
        const [cachedSongs, cachedIndices] = await Promise.all([
          db.songs.toArray(),
          db.songIndex.toArray(),
        ]);
        await SearchEngine.indexSongs(cachedIndices.map(normalizeSongIndex));
        await SearchEngine.indexLyrics(cachedSongs);
        onProgress?.(100, `Song catalog is current (${manifest.songCount} songs).`);
        return 'skipped';
      }

      onProgress?.(20, 'Downloading song catalog...');
      const [indexData, exportedSongs] = await Promise.all([
        fetchExport<ExportIndex>('index.json'),
        fetchExport<SongDetail[]>('all-songs.json'),
      ]);
      if (!Array.isArray(indexData.songs) || !Array.isArray(exportedSongs)) {
        throw new Error('Song catalog data is malformed.');
      }
      if (
        indexData.songs.length !== manifest.songCount ||
        exportedSongs.length !== manifest.songCount ||
        exportedSongs.some(song => !Number.isInteger(song.id) || !song.title || typeof song.display !== 'string')
      ) {
        throw new Error('Song catalog failed validation; keeping the existing local catalog.');
      }

      const songs = exportedSongs.map(song => ({
        ...song,
        sections: song.sections?.length ? song.sections : parseDisplayToSections(song.display || ''),
      }));
      const indices = indexData.songs.map(song => normalizeSongIndex({
        ...song,
        searchTokens: song.searchTokens || `${song.title} ${song.artist || ''} ${song.language || ''}`.toLowerCase(),
      }));

      onProgress?.(75, `Saving ${songs.length} songs for offline use...`);
      await db.transaction('rw', [db.songs, db.songIndex, db.syncMeta], async () => {
        await db.songs.clear();
        await db.songIndex.clear();
        await db.songs.bulkAdd(songs);
        await db.songIndex.bulkAdd(indices);
        await db.syncMeta.put({
          id: CATALOG_SYNC_ID,
          version: String(manifest.version),
          generatedAt: manifest.generatedAt,
          songCount: manifest.songCount,
          lastSyncedAt: Date.now(),
        });
      });

      await SearchEngine.indexSongs(indices);
      await SearchEngine.indexLyrics(songs);
      onProgress?.(100, `Cached ${songs.length} songs for offline use.`);
      return 'completed';
    } catch (error) {
      console.error('Song catalog sync failed:', error);
      const [cachedSongs, cachedIndices] = await Promise.all([
        db.songs.toArray(),
        db.songIndex.toArray(),
      ]);
      if (cachedSongs.length > 0 && cachedSongs.length === cachedIndices.length) {
        await SearchEngine.indexSongs(cachedIndices.map(normalizeSongIndex));
        await SearchEngine.indexLyrics(cachedSongs);
        onProgress?.(100, `Using saved catalog (${cachedSongs.length} songs).`);
        return 'skipped';
      }
      onProgress?.(0, 'Could not load the song catalog. Connect once to cache songs.');
      return 'error';
    } finally {
      catalogSyncPromise = null;
    }
  })();

  return catalogSyncPromise;
}

/** Startup sync reads the generated static catalog and refreshes IndexedDB. */
export async function wakeUpSync(_trigger: SyncTrigger = 'app-start'): Promise<SyncResult> {
  const startTime = Date.now();
  const result = await batchDownloadSongs();
  return {
    success: result !== 'error',
    changedSongs: result === 'completed' ? await db.songs.count() : 0,
    updatedSongs: 0,
    insertedSongs: 0,
    deletedSongs: 0,
    verificationPassed: result !== 'error',
    duration: Date.now() - startTime,
    errors: result === 'error' ? ['Static song catalog sync failed.'] : [],
  };
}

/** Load the catalog index from IndexedDB or its static export. */
export async function getSongs(): Promise<SongIndex[]> {
  const localSongs = await db.songIndex.toArray();

  if (localSongs.length > 0) {
    console.log('📱 App Mode: Returning songs from IndexedDB');
    return localSongs.map(normalizeSongIndex);
  }

  const indexData = await fetchExport<ExportIndex>('index.json');
  if (!Array.isArray(indexData.songs)) throw new Error('Static song index is malformed.');

  const indices = indexData.songs.map(song => normalizeSongIndex({
    ...song,
    searchTokens: song.searchTokens || `${song.title} ${song.artist || ''} ${song.language || ''}`.toLowerCase(),
  }));
  await db.songIndex.bulkPut(indices);
  return indices;
}

/** Load a song from IndexedDB, syncing the static bundle when it is missing. */
export async function getSongById(id: number): Promise<SongDetail | null> {
  const localSong = await db.songs.get(id);

  if (localSong?.display?.trim()) return localSong;

  const result = await batchDownloadSongs();
  if (result === 'error') return localSong ?? null;
  return (await db.songs.get(id)) ?? localSong ?? null;
}
