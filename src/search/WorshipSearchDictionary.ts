/**
 * Worship Search Dictionary - Central alias dictionary for worship terms
 * 
 * This module provides aliases for common worship terms that can be
 * expanded during search document generation. These aliases are shared
 * across all songs and help users find songs using different spellings
 * or languages.
 * 
 * Example: Searching for "yesu", "yeshu", or "jesus" should all find
 * songs about Jesus.
 */

/**
 * Worship term alias groups
 * Each group contains the canonical form first, followed by common variants
 */
const WORSHIP_TERM_ALIASES: Record<string, string[]> = {
  // Jesus
  'yeshu': ['yesu', 'yeshoo', 'yeesu', 'jesus'],
  
  // Christ
  'khrista': ['khrist', 'christ', 'christa', 'krista'],
  
  // Lord
  'prabhu': ['prabu', 'prabhoo', 'lord'],
  
  // Savior
  'tarak': ['taranara', 'saviour', 'savior', 'redeemer'],
  
  // Cross
  'krus': ['krusas', 'cross', 'kroos'],
  
  // Praise
  'stuti': ['stutii', 'stooti', 'praise'],
  
  // Worship
  'aradhana': ['aaradhana', 'karuya', 'worship'],
  
  // Heaven
  'swarg': ['swarga', 'svarg', 'heaven'],
  
  // Joy
  'anand': ['aanand', 'joy'],
  
  // Grace
  'krupa': ['krupe', 'krupae', 'grace'],
  
  // Mercy
  'daya': ['mercy'],
  
  // Blood
  'rakte': ['rakta', 'blood'],
  
  // Shepherd
  'mendhpal': ['mendhapal', 'shepherd'],
  
  // Friend
  'mitra': ['friend'],
  
  // Service
  'seva': ['service', 'ministry'],
  
  // Light
  'prakash': ['prakashit', 'light'],
  
  // Divine
  'divya': ['heavenly', 'divine'],
  
  // Blessing
  'dhanya': ['blessed', 'blessing'],
};

/**
 * Get all aliases for a canonical worship term
 * Returns an array with the canonical form first, followed by variants
 */
export function getWorshipTermAliases(canonicalTerm: string): string[] {
  const lowerTerm = canonicalTerm.toLowerCase();
  
  // Find the canonical form (case-insensitive)
  for (const [canonical, aliases] of Object.entries(WORSHIP_TERM_ALIASES)) {
    if (canonical.toLowerCase() === lowerTerm) {
      return [canonical, ...aliases];
    }
  }
  
  // If not found, return just the term itself
  return [canonicalTerm];
}

/**
 * Expand a text string by replacing worship terms with their aliases
 * This is used during search document generation to add searchable variants
 * 
 * Example: "yeshu majha" → "yeshu yesu yeshoo yeesu jesus majha"
 */
export function expandWorshipTerms(text: string): string {
  const words = text.toLowerCase().split(/\s+/);
  const expandedWords: string[] = [];
  
  for (const word of words) {
    // Check if this word matches any canonical term
    let found = false;
    for (const [canonical, aliases] of Object.entries(WORSHIP_TERM_ALIASES)) {
      if (word === canonical.toLowerCase() || aliases.includes(word)) {
        // Add all variants
        expandedWords.push(canonical, ...aliases);
        found = true;
        break;
      }
    }
    
    if (!found) {
      expandedWords.push(word);
    }
  }
  
  return expandedWords.join(' ');
}

/**
 * Get all canonical worship terms
 */
export function getAllCanonicalTerms(): string[] {
  return Object.keys(WORSHIP_TERM_ALIASES);
}

/**
 * Check if a term is a worship term (canonical or alias)
 */
export function isWorshipTerm(term: string): boolean {
  const lowerTerm = term.toLowerCase();
  
  for (const [canonical, aliases] of Object.entries(WORSHIP_TERM_ALIASES)) {
    if (canonical.toLowerCase() === lowerTerm || aliases.includes(lowerTerm)) {
      return true;
    }
  }
  
  return false;
}
