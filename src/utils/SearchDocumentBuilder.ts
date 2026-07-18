import type { SongIndex } from '../db/Database';
import searchDocuments from '../Search_1.0.json';

// Helper to canonicalize language name for matching keys
function getLanguageKey(language: string | undefined): string {
  if (!language) return 'unknown';
  const lower = language.toLowerCase().trim();
  if (lower === 'hin' || lower === 'hi') return 'hindi';
  if (lower === 'eng' || lower === 'en') return 'english';
  if (lower === 'mar' || lower === 'mr') return 'marathi';
  if (lower === 'kok' || lower === 'kn') return 'konkani';
  return lower;
}

// Cache for all search documents to avoid repeated lookups, keyed by "language_songNumber"
const searchDocumentsMap = new Map<string, { title: string; language: string; transliteratedTitle: string }>();

// Initialize the map from the imported JSON using a composite key
for (const doc of searchDocuments) {
  if (doc.transliteratedTitle) {
    const key = `${getLanguageKey(doc.language)}_${doc.songNumber}`;
    searchDocumentsMap.set(key, {
      title: doc.title,
      language: doc.language,
      transliteratedTitle: doc.transliteratedTitle
    });
  }
}

console.log(`[SearchDocumentBuilder] Loaded ${searchDocumentsMap.size} search documents from Search_1.0.json`);

/**
 * SearchDocument - Internal runtime object for search indexing
 * Never stored in Supabase or IndexedDB. Exists only while building MiniSearch index.
 */
export interface SearchDocument {
  id: number;
  title: string;
  artist?: string;
  songNumber: number;
  language?: string;
  transliteratedTitle?: string;
  artistSearch: string;
}

/**
 * Hindi to English transliteration map
 * Covers common Devanagari characters used in song titles
 */
const HINDI_TRANSLITERATION_MAP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ii', 'उ': 'u', 'ऊ': 'uu',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ं': 'm', 'ः': 'h', 'ऽ': "'",
  // Matras (vowel signs)
  'ा': 'a', 'ि': 'i', 'ी': 'ii', 'ु': 'u', 'ू': 'uu',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  '्': '', // halant (removes inherent vowel)
  // Numbers
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  // Common conjuncts and special characters
  'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy', 'श्र': 'shr',
};

/**
 * Marathi to English transliteration map
 * Similar to Hindi but with some Marathi-specific variations
 */
const MARATHI_TRANSLITERATION_MAP: Record<string, string> = {
  ...HINDI_TRANSLITERATION_MAP,
  'ळ': 'l', // Marathi-specific retroflex lateral
};

/**
 * Detect if text contains Hindi/Devanagari script
 */
function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Transliterate Hindi/Devanagari text to English
 */
function transliterateHindi(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Check for conjuncts (2-character combinations)
    if (i < text.length - 1) {
      const conjunct = char + text[i + 1];
      if (HINDI_TRANSLITERATION_MAP[conjunct]) {
        result += HINDI_TRANSLITERATION_MAP[conjunct];
        i++; // Skip next character
        continue;
      }
    }
    result += HINDI_TRANSLITERATION_MAP[char] || char;
  }
  return result;
}

/**
 * Transliterate Marathi text to English
 */
function transliterateMarathi(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Check for conjuncts (2-character combinations)
    if (i < text.length - 1) {
      const conjunct = char + text[i + 1];
      if (MARATHI_TRANSLITERATION_MAP[conjunct]) {
        result += MARATHI_TRANSLITERATION_MAP[conjunct];
        i++; // Skip next character
        continue;
      }
    }
    result += MARATHI_TRANSLITERATION_MAP[char] || char;
  }
  return result;
}

/**
 * Normalize text for search:
 * 1. Lowercase
 * 2. Trim whitespace
 * 3. Collapse multiple spaces
 */
function normalizeText(text: string | undefined): string {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Transliterate text based on language
 */
function transliterateText(text: string, language?: string): string {
  if (!text) return '';
  
  const normalizedLang = language?.toLowerCase().trim();
  
  if (normalizedLang === 'hindi' || normalizedLang === 'hin' || normalizedLang === 'hi') {
    if (containsDevanagari(text)) {
      return transliterateHindi(text);
    }
  }
  
  if (normalizedLang === 'marathi' || normalizedLang === 'mar' || normalizedLang === 'mr') {
    if (containsDevanagari(text)) {
      return transliterateMarathi(text);
    }
  }
  
  // For English or other languages, return as-is
  return text;
}

/**
 * Build artistSearch field using the same principle as titleSearch
 */
function buildArtistSearch(artist: string | undefined, language?: string): string {
  if (!artist) return '';
  
  const normalizedArtist = normalizeText(artist);
  const transliterated = transliterateText(artist, language);
  const normalizedTransliterated = normalizeText(transliterated);
  
  // Only add transliteration if it's different from the normalized original
  if (normalizedTransliterated && normalizedTransliterated !== normalizedArtist) {
    return `${normalizedArtist} ${normalizedTransliterated}`;
  }
  
  return normalizedArtist;
}

import { canonicalizeForIndex } from '../search/HindiMarathiDictionary';

/**
 * Build a SearchDocument from a SongIndex
 * This is the only module that should generate search fields
 */
export function buildSearchDocument(song: SongIndex): SearchDocument {
  // Get normalized title and transliteratedTitle from Search_1.0.json for all languages
  let normalizedTitle: string | undefined;
  let transliteratedTitle: string | undefined;
  
  const key = `${getLanguageKey(song.language)}_${song.songNumber}`;
  const searchDoc = searchDocumentsMap.get(key);
  if (searchDoc) {
    normalizedTitle = searchDoc.title; // Use normalized title from Search_1.0.json
    transliteratedTitle = searchDoc.transliteratedTitle;
  }
  
  // Canonicalize the transliterated title so spelling variants in indices match query variants
  const canonicalTransliteratedTitle = transliteratedTitle 
    ? canonicalizeForIndex(transliteratedTitle) 
    : undefined;
  
  return {
    id: song.id,
    title: normalizedTitle || song.title, // Use normalized title from Search_1.0.json, fallback to original
    artist: song.artist,
    songNumber: song.songNumber,
    language: song.language,
    transliteratedTitle: canonicalTransliteratedTitle,
    artistSearch: buildArtistSearch(song.artist, song.language),
  };
}


/**
 * Build SearchDocuments from an array of SongIndex
 */
export function buildSearchDocuments(songs: SongIndex[]): SearchDocument[] {
  return songs.map(buildSearchDocument);
}
