import type { SongDetail } from '../db/Database';

/**
 * LyricsDocument - Internal runtime object for lyrics search indexing
 * Never stored in Supabase or IndexedDB. Exists only while building MiniSearch index.
 */
export interface LyricsDocument {
  id: number;
  songNumber: number;
  title: string;
  language?: string;
  lyricsSearch: string;
}

/**
 * Extract plain lyrics from a song's structured data
 * Removes chords, formatting, and markers to produce searchable text
 */
function extractPlainLyrics(song: SongDetail): string {
  // If the song has a plain lyrics field, use it directly
  if (song.lyrics) {
    return song.lyrics;
  }

  // Otherwise, extract from sections
  if (!song.sections || song.sections.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  for (const section of song.sections) {
    for (const line of section.lines) {
      if (line.text) {
        lines.push(line.text);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Clean lyrics for search indexing
 * Removes chord markers, section labels, formatting, and normalizes whitespace
 */
function cleanLyricsForSearch(lyrics: string): string {
  if (!lyrics) return '';

  let cleaned = lyrics;

  // Remove chord markers AND section markers like [G], [Am], [Verse], [Chorus], etc.
  // A single broad regex covers all [bracket] content.
  cleaned = cleaned.replace(/\[[^\]]+\]/g, '');

  // Remove other formatting markers
  cleaned = cleaned.replace(/\{[^}]+\}/g, ''); // Remove {brackets}
  cleaned = cleaned.replace(/<[^>]+>/g, ''); // Remove <html>
  cleaned = cleaned.replace(/\([^)]*\)/g, ''); // Remove (parenthetical notes)

  // Normalize whitespace: collapse multiple spaces/newlines into single space
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Lowercase for search
  cleaned = cleaned.toLowerCase();

  return cleaned;
}

import { canonicalizeForIndex } from '../search/HindiMarathiDictionary';

/**
 * Build a LyricsDocument from a SongDetail
 * This is the only module that should generate lyrics search fields
 */
export function buildLyricsDocument(song: SongDetail): LyricsDocument | null {
  // Extract plain lyrics from the song
  const plainLyrics = extractPlainLyrics(song);

  // Clean and normalize for search
  const cleanLyrics = cleanLyricsForSearch(plainLyrics);

  // Skip songs without sufficient lyrics (less than 10 characters after cleaning)
  if (!cleanLyrics || cleanLyrics.length < 10) {
    return null;
  }

  // Canonicalize the lyrics text so spelling variations match query normalization
  // Uses the fast (no Levenshtein) variant — safe on large text bodies
  const canonicalLyricsSearch = canonicalizeForIndex(cleanLyrics);

  return {
    id: song.id,
    songNumber: song.songNumber,
    title: song.title,
    language: song.language,
    lyricsSearch: canonicalLyricsSearch
  };
}


/**
 * Build LyricsDocuments from an array of SongDetail
 * Filters out songs without sufficient lyrics
 */
export function buildLyricsDocuments(songs: SongDetail[]): LyricsDocument[] {
  console.log('[LyricsDocumentBuilder] Processing', songs.length, 'songs for lyrics indexing');
  
  const documents = songs
    .map(buildLyricsDocument)
    .filter((doc): doc is LyricsDocument => doc !== null);
  
  console.log('[LyricsDocumentBuilder] Generated', documents.length, 'lyrics documents');
  console.log('[LyricsDocumentBuilder] Filtered out', songs.length - documents.length, 'songs without sufficient lyrics');
  
  return documents;
}

/**
 * Extract a snippet of lyrics around a search term
 * Returns the longest matching phrase from the query
 */
export function extractLyricsSnippet(lyricsSearch: string, query: string): string {
  if (!lyricsSearch || !query) return '';

  // Normalize the query to match what cleanLyricsForSearch stored:
  // strip punctuation, collapse whitespace, lowercase.
  const normalizedQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/g, '') // strip punctuation (keep Devanagari)
    .replace(/\s+/g, ' ')
    .trim();

  const queryIndex = lyricsSearch.indexOf(normalizedQuery);

  if (queryIndex !== -1) {
    // Exact match found - extract a context window around it
    const start = Math.max(0, queryIndex - 10);
    const end = Math.min(lyricsSearch.length, queryIndex + normalizedQuery.length + 30);
    const snippet = lyricsSearch.slice(start, end).trim();
    return (start > 0 ? '...' : '') + snippet + (end < lyricsSearch.length ? '...' : '');
  }

  // If exact match not found, try to find the longest matching phrase
  const words = normalizedQuery.split(/\s+/);
  let longestMatch = '';
  
  // Try progressively shorter phrases from the start
  for (let i = words.length; i > 0; i--) {
    const phrase = words.slice(0, i).join(' ');
    if (lyricsSearch.includes(phrase)) {
      longestMatch = phrase;
      break;
    }
  }
  
  // If no prefix match, try each individual word
  if (!longestMatch) {
    for (const word of words) {
      if (word.length > 2 && lyricsSearch.includes(word)) { // skip tiny words
        longestMatch = word;
        break;
      }
    }
  }
  
  if (!longestMatch) return '';
  
  // Extract context around the match
  const matchIndex = lyricsSearch.indexOf(longestMatch);
  if (matchIndex !== -1) {
    const start = Math.max(0, matchIndex - 10);
    const end = Math.min(lyricsSearch.length, matchIndex + longestMatch.length + 30);
    const snippet = lyricsSearch.slice(start, end).trim();
    return (start > 0 ? '...' : '') + snippet + (end < lyricsSearch.length ? '...' : '');
  }
  
  return longestMatch;
}
