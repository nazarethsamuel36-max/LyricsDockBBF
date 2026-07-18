import type { SearchDocument } from './SearchDocumentBuilder';
import type { LyricsDocument } from './LyricsDocumentBuilder';
import { extractLyricsSnippet } from './LyricsDocumentBuilder';

/**
 * SearchRanker - Responsible for ordering candidate songs
 * 
 * This module handles the ranking pipeline that operates on candidates
 * returned by MiniSearch. It applies deterministic rules to order results.
 * 
 * Future stages can be added here:
 * - Stage 5: Dictionary-normalized matches
 * - Stage 6: Levenshtein typo correction
 */

import { HINDI_MARATHI_ROMANIZATION } from '../search/HindiMarathiDictionary';

/**
 * Normalize a stored field for phrase comparison.
 * Strips non-alphanumeric chars, collapses whitespace, lowercases.
 */
function normalizeForPhrase(text: string | undefined | null): string {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Expand a query phrase into all synonym permutations for phrase matching.
 * Uses the comprehensive HINDI_MARATHI_ROMANIZATION dictionary.
 * Returns an array of normalized phrase strings.
 */
function expandQueryPhrases(query: string): string[] {
  const lower = query.toLowerCase().trim();
  const tokens = lower.split(/\s+/);
  
  // For each token, collect all possible forms (original + synonyms)
  const tokenVariants: string[][] = tokens.map(token => {
    const variants = [token];
    
    // Find matching group in HINDI_MARATHI_ROMANIZATION
    for (const [canonical, group] of Object.entries(HINDI_MARATHI_ROMANIZATION)) {
      if (canonical === token || group.includes(token)) {
        if (!variants.includes(canonical)) {
          variants.push(canonical);
        }
        for (const member of group) {
          if (!variants.includes(member)) {
            variants.push(member);
          }
        }
        break; // Stop looking after finding the matching group
      }
    }
    return variants;
  });
  
  // Generate cartesian product of all token variants (capped to prevent explosion)
  let phrases: string[][] = [[]];
  for (const variants of tokenVariants) {
    const next: string[][] = [];
    for (const prefix of phrases) {
      for (const v of variants) {
        if (next.length >= 50) break; // Safety cap
        next.push([...prefix, v]);
      }
    }
    phrases = next;
  }
  
  return phrases.map(p => p.join(' '));
}


/**
 * Candidate with match type information
 */
interface SearchCandidate {
  id: number;
  score: number;
  matchType: 'title' | 'lyrics';
}

/**
 * Ranking result with computed score and tier information
 */
export interface RankedResult {
  id: number;
  score: number;
  tier: number;
  reason: string;
  matchType: 'title' | 'lyrics' | 'both';
  lyricsSnippet?: string;
}

/**
 * Compute ranking score according to Search Engine 1.0 Ranking Contract:
 * 
 * Primary Rank: Songs whose title contains a word that starts with the user's query
 * Secondary Rank: Songs where the query appears elsewhere in the title
 * 
 * Architectural rule: Treat original script and transliteration as the same title for ranking.
 * Primary Rank is absolute - all songs with word-starting matches must be shown before any Secondary Rank songs.
 * 
 * Ranking order (absolute score ranges that cannot be overridden):
 * 1. Title starts with query in either script: 10000000+ (Tier 1 - NO LIMIT)
 * 2. Word starts with query inside title in either script: 1000000+ (Tier 2 - NO LIMIT)
 * 3. Word appears later in title in either script (substring): 100000+ (Tier 3 - Secondary Rank)
 * 4. Everything else (MiniSearch base score): <100000 (lowest priority)
 */
function computeRankingScore(
  searchDoc: SearchDocument,
  queryPhrases: string[],
  miniSearchScore: number
): { score: number; tier: number; reason: string } {
  const title = normalizeForPhrase(searchDoc.title); // Original script (Devanagari)
  const transliteratedTitle = normalizeForPhrase(searchDoc.transliteratedTitle); // Transliterated title
  
  // Tier 1: Title starts with the query phrase (or any of its synonym permutations)
  const titleStartsPhrase = queryPhrases.some(phrase => 
    title.startsWith(phrase) || transliteratedTitle.startsWith(phrase)
  );
  
  if (titleStartsPhrase) {
    return { score: 10000000 + miniSearchScore, tier: 1, reason: 'Title starts with query' };
  }
  
  // Tier 2: A word inside the title starts with the query phrase at a word boundary
  const wordStartsPhrase = queryPhrases.some(phrase => 
    title.startsWith(phrase) || 
    title.includes(' ' + phrase) || 
    transliteratedTitle.startsWith(phrase) || 
    transliteratedTitle.includes(' ' + phrase)
  );
  
  if (wordStartsPhrase) {
    return { score: 1000000 + miniSearchScore, tier: 2, reason: 'Word starts with query' };
  }
  
  // Tier 3: Query appears as a substring inside the title (contains but not starting at a word boundary)
  const substringMatch = queryPhrases.some(phrase => 
    title.includes(phrase) || transliteratedTitle.includes(phrase)
  );
  
  if (substringMatch) {
    return { score: 100000 + miniSearchScore, tier: 3, reason: 'Substring match' };
  }
  
  return { score: miniSearchScore, tier: 4, reason: 'MiniSearch score only' };
}

/**
 * SearchRanker - Main ranking pipeline
 * 
 * Takes candidate songs from MiniSearch and applies ranking rules to order them.
 */
export class SearchRanker {
  /**
   * Rank and merge title and lyrics search candidates
   * 
   * Rules:
   * - Title matches always rank above lyric-only matches
   * - No duplicate songs (if a song matches both, show as title match)
   * - Title matches use existing tier system
   * - Lyrics-only matches get lower priority scores
   * 
   * @param titleCandidates - Candidates from title MiniSearch
   * @param lyricsCandidates - Candidates from lyrics MiniSearch
   * @param searchDocs - Map of SearchDocument objects (for title access)
   * @param lyricsDocs - Map of LyricsDocument objects (for snippet extraction)
   * @param query - Original user query
   * @param normalizedQuery - Normalized query (after synonym normalization)
   * @param limit - Maximum number of secondary rank results to return
   * @returns Ranked and filtered results
   */
  static rankCandidates(
    titleCandidates: SearchCandidate[],
    lyricsCandidates: SearchCandidate[],
    searchDocs: Map<number, SearchDocument>,
    lyricsDocs: Map<number, LyricsDocument>,
    query: string,
    normalizedQuery: string,
    limit: number = 10,
    queryWordCount: number = 1
  ): Array<{ id: number; score: number; tier: number; reason: string; matchType: 'title' | 'lyrics' | 'both'; lyricsSnippet?: string }> {
    // Build phrase variants for ranking
    const queryPhrases = expandQueryPhrases(query);
    
    // Track which songs have title matches
    const titleMatchIds = new Set(titleCandidates.map(c => c.id));
    
    // Process title candidates with existing ranking system
    const rankedTitleCandidates = titleCandidates
      .map(candidate => {
        const searchDoc = searchDocs.get(candidate.id);
        if (!searchDoc) {
          console.warn(`[RANKING] SearchDocument not found for ID ${candidate.id}`);
          return null;
        }
        
        const ranking = computeRankingScore(searchDoc, queryPhrases, candidate.score);
        
        return {
          id: candidate.id,
          score: ranking.score,
          tier: ranking.tier,
          reason: ranking.reason,
          matchType: 'title' as const
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    
    // Normalize the query phrase once for substring checking.
    // Strip punctuation and collapse whitespace to match what cleanLyricsForSearch stores.
    // e.g. "Amazing grace, how sweet the sound!" → "amazing grace how sweet the sound"
    const normalizedQueryPhrase = normalizedQuery
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f\s]/g, '') // strip punctuation (keep Devanagari)
      .replace(/\s+/g, ' ')
      .trim();
    
    const lyricsOnlyCandidates = lyricsCandidates
      .filter(candidate => !titleMatchIds.has(candidate.id))
      .map(candidate => {
        const lyricsDoc = lyricsDocs.get(candidate.id);
        if (!lyricsDoc) {
          console.warn(`[RANKING] LyricsDocument not found for ID ${candidate.id}`);
          return null;
        }
        
        // Extract lyrics snippet for display (use original query to get exact user input)
        const lyricsSnippet = extractLyricsSnippet(lyricsDoc.lyricsSearch, query);
        
        // === EXACT PHRASE BOOST ===
        // If the cleaned lyrics contain the normalized query as a contiguous substring,
        // this is an exact phrase match — boost it to the very top (above all title tiers).
        const hasExactPhrase = lyricsDoc.lyricsSearch.includes(normalizedQueryPhrase);
        
        let lyricsScore: number;
        let tier: number;
        let reason: string;
        
        if (hasExactPhrase && queryWordCount >= 2) {
          // Exact contiguous phrase found — rank above ALL title tiers
          lyricsScore = 20000000 + candidate.score;
          tier = 0;
          reason = 'Exact lyrics phrase match';
        } else {
          // Lyrics-only matches get lower priority scores (below all title tiers)
          lyricsScore = 50000 + candidate.score;
          tier = 4;
          reason = 'Lyrics match';
        }
        
        return {
          id: candidate.id,
          score: lyricsScore,
          tier,
          reason,
          matchType: 'lyrics' as const,
          lyricsSnippet
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    
    // Merge and sort all candidates
    const allCandidates = [...rankedTitleCandidates, ...lyricsOnlyCandidates]
      .sort((a, b) => b.score - a.score);
    
    // Search Engine 1.0: Separate Primary Rank and Secondary Rank
    // Primary Rank (score >= 1000000): NO LIMIT - show all songs starting with query word
    // Secondary Rank (score < 1000000): Apply limit
    const primaryRankResults = allCandidates.filter(r => r.score >= 1000000);
    const secondaryRankResults = allCandidates.filter(r => r.score < 1000000);
    
    const finalRanked = [...primaryRankResults, ...secondaryRankResults.slice(0, limit)].slice(0, Math.max(limit, 30));
    
    return finalRanked;
  }
}
