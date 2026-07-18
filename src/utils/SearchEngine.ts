import MiniSearch from 'minisearch';
import type { SongIndex, SongDetail } from '../db/Database';
import { buildSearchDocuments, type SearchDocument } from './SearchDocumentBuilder';
import { buildLyricsDocuments, type LyricsDocument } from './LyricsDocumentBuilder';
import { SearchRanker } from './SearchRanker';

import { canonicalizeQuery } from '../search/HindiMarathiDictionary';

/**
 * Normalize a user search query:
 * 1. Lowercase
 * 2. Map any worship variant to canonical form
 * Returns the normalized query string.
 */
function normalizeSearchQuery(query: string): string {
  return canonicalizeQuery(query);
}



export class SearchEngine {
  // Title Search Index (existing)
  private static titleMiniSearch = new MiniSearch<SearchDocument>({
    fields: ['transliteratedTitle', 'artistSearch', 'songNumber'],
    storeFields: ['id', 'title', 'artist', 'songNumber', 'language', 'transliteratedTitle'],
    searchOptions: {
      boost: { transliteratedTitle: 3, songNumber: 5, artistSearch: 1.2 },
      fuzzy: 0.2,
      prefix: true
    }
  });

  // Lyrics Search Index (new)
  private static lyricsMiniSearch = new MiniSearch<LyricsDocument>({
    fields: ['lyricsSearch', 'title'],
    storeFields: ['id', 'songNumber', 'title', 'language'],
    searchOptions: {
      boost: { lyricsSearch: 1, title: 0.5 },
      // Use AND so ALL words must be present — prevents false positives from common words.
      // Fuzzy and prefix are kept for single-word typed queries but overridden for long phrases.
      combineWith: 'AND',
      fuzzy: 0.15,
      prefix: true
    }
  });

  private static isTitleIndexed = false;
  private static isLyricsIndexed = false;
  private static searchDocCache: Map<number, SearchDocument> = new Map();
  private static lyricsDocCache: Map<number, LyricsDocument> = new Map();

  static async indexSongs(songs: SongIndex[]) {
    console.log('[SearchEngine] indexSongs: Building SearchDocuments for', songs.length, 'songs');
    this.titleMiniSearch.removeAll();
    
    // Build SearchDocuments using SearchDocumentBuilder
    const searchDocuments = buildSearchDocuments(songs);
    
    // Deduplicate by ID to prevent MiniSearch duplicate key errors (handle string/number mismatches)
    const seen = new Set<string>();
    const unique = searchDocuments.filter(s => {
      const idStr = String(s.id);
      if (seen.has(idStr)) return false;
      seen.add(idStr);
      return true;
    });
    this.titleMiniSearch.addAll(unique);
    this.isTitleIndexed = true;
    
    // Cache SearchDocuments for reuse during search (avoid rebuilding on every keystroke)
    this.searchDocCache = new Map(unique.map(s => [s.id, s]));
    console.log('[SearchEngine] indexSongs: Cached', this.searchDocCache.size, 'SearchDocuments');
  }

  /**
   * Index lyrics from SongDetail objects
   * This is separate from title indexing and requires full song details
   */
  static async indexLyrics(songs: SongDetail[]) {
    console.log('[SearchEngine] indexLyrics: Building LyricsDocuments for', songs.length, 'songs');
    this.lyricsMiniSearch.removeAll();
    
    // Build LyricsDocuments using LyricsDocumentBuilder
    const lyricsDocuments = buildLyricsDocuments(songs);
    
    // Deduplicate by ID
    const seen = new Set<string>();
    const unique = lyricsDocuments.filter(s => {
      const idStr = String(s.id);
      if (seen.has(idStr)) return false;
      seen.add(idStr);
      return true;
    });
    this.lyricsMiniSearch.addAll(unique);
    this.isLyricsIndexed = true;
    
    // Cache LyricsDocuments for snippet extraction
    this.lyricsDocCache = new Map(unique.map(s => [s.id, s]));
    console.log('[SearchEngine] indexLyrics: Cached', this.lyricsDocCache.size, 'LyricsDocuments');
  }

  static search(songs: SongIndex[], query: string): (SongIndex & { score: number; matchType: 'title' | 'lyrics' | 'both'; lyricsSnippet?: string })[] {
    return this.searchWithLimit(songs, query, Infinity);
  }

  static searchWithLimit(songs: SongIndex[], query: string, limit: number = 10): (SongIndex & { score: number; matchType: 'title' | 'lyrics' | 'both'; lyricsSnippet?: string })[] {
    const startTime = performance.now();
    
    if (!query.trim()) {
      return [];
    }

    // 1. Numeric Search Bypass (Rule agx004)
    const numericQuery = query.trim();
    if (/^\d+$/.test(numericQuery)) {
      const results = songs
        .filter(s => s.songNumber.toString() === numericQuery || s.songNumber.toString().startsWith(numericQuery))
        .map(s => ({ 
          ...s, 
          score: s.songNumber.toString() === numericQuery ? 1000 : 900,
          matchType: 'title' as const,
          lyricsSnippet: undefined
        }))
        .sort((a, b) => b.score - a.score || a.songNumber - b.songNumber);
      
      return results.slice(0, limit);
    }

    // 3. Ensure title index is built
    const normalizedQuery = normalizeSearchQuery(query);

    // 3. Ensure title index is built
    if (!this.isTitleIndexed) {
      console.warn('ERROR: Search called before indexSongs was initialized');
      return [];
    }

    // 4. MiniSearch for candidate retrieval (title search)
    let titleResults: any[] = [];
    try {
      titleResults = this.titleMiniSearch.search(normalizedQuery);
    } catch (err) {
      console.warn('[SearchEngine] Title MiniSearch threw (likely special chars in query):', err);
    }

    // 5. MiniSearch for lyrics search (if indexed)
    let lyricsResults: any[] = [];
    if (this.isLyricsIndexed) {
      // For multi-word queries (>=3 words), disable fuzzy to avoid false positives
      // when the user pastes an exact lyric phrase. Single/double words keep fuzzy.
      const queryWordCount = normalizedQuery.trim().split(/\s+/).length;
      const lyricsSearchOptions = queryWordCount >= 3
        ? { combineWith: 'AND' as const, fuzzy: false, prefix: false }
        : { combineWith: 'AND' as const, fuzzy: 0.15, prefix: true };

      try {
        lyricsResults = this.lyricsMiniSearch.search(normalizedQuery, lyricsSearchOptions);
      } catch (err) {
        console.warn('[SearchEngine] Lyrics MiniSearch threw (likely special chars in query):', err);
      }
    } else {
      console.log('Lyrics index not built, skipping lyrics search');
    }
    
    // 6. Filter candidates to valid songs and merge title + lyrics results
    const validIds = new Set(songs.map(s => s.id));
    const songMap = new Map(songs.map(s => [s.id, s]));
    
    // Process title results
    const titleCandidates = titleResults
      .filter(res => validIds.has(res.id as any))
      .map(res => ({ id: res.id as number, score: res.score, matchType: 'title' as const }));
    
    // Process lyrics results
    const lyricsCandidates = lyricsResults
      .filter(res => validIds.has(res.id as any))
      .map(res => ({ id: res.id as number, score: res.score, matchType: 'lyrics' as const }));
    
    console.log(`Valid Title Candidates: ${titleCandidates.length}`);
    console.log(`Valid Lyrics Candidates: ${lyricsCandidates.length}`);
    
    // 7. Apply ranking via SearchRanker (now handles both title and lyrics matches)
    const rankedCandidates = SearchRanker.rankCandidates(
      titleCandidates,
      lyricsCandidates,
      this.searchDocCache,
      this.lyricsDocCache,
      query,
      normalizedQuery,
      limit,
      normalizedQuery.trim().split(/\s+/).length
    );
    
    // 8. Map ranked results back to SongIndex objects with metadata
    const finalResults = rankedCandidates
      .map(ranked => {
        const original = songMap.get(ranked.id);
        if (!original) return null;
        return {
          ...original,
          score: ranked.score,
          matchType: ranked.matchType,
          lyricsSnippet: ranked.lyricsSnippet
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null) as (SongIndex & { score: number; matchType: 'title' | 'lyrics' | 'both'; lyricsSnippet?: string })[];

    const endTime = performance.now();
    console.log(`[SearchEngine] query "${query}" took ${(endTime - startTime).toFixed(1)}ms (${finalResults.length} results)`);
    
    return finalResults;
  }
}

