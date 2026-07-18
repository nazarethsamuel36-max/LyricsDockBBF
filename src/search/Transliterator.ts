/**
 * Transliterator - Canonical transliteration for search indexing
 * 
 * This module provides canonical transliterations for Marathi song titles.
 * The transliterations are manually curated for accuracy and will be used
 * to generate searchable text for the search engine.
 * 
 * This is NOT an input method editor. It is for index generation only.
 */

/**
 * Canonical Marathi transliterations map
 * Maps song IDs to their canonical English transliteration
 */
const MARATHI_CANONICAL_TRANSLITERATIONS: Record<number, string> = {
  587: 'khrista majha to sarvancha ya nama tyala',
  588: 'dhanyavad yeshula',
  589: 'kiti anand ha swargiya anand ha',
  590: 'prati dini prati veli kahi ghadu de',
  591: 'ya sarva miluni gau geet vaibhavi khristache',
  592: 'khrista majha taranara mala vate priya far',
  593: 'harsh vatato bahut harsh vatato',
  594: 'tujhe vatsalya jivanahun shreshtha',
  595: 'stuti stuti karuya upkar stuti karuya',
  596: 'krusas yeshu tangla arpilela kokara',
  597: 'stav tujha karu dhava he sukhachya ugama',
  598: 'yeshu majha mendhpal amhi tyachi mendhare',
  599: 'dhanya ho dhanya yeshu majha',
  600: 'tu bolavile seva karaya prabhu alo anande',
  601: 'hoil vrishti krupechi',
  602: 'vanda vanda tarak prabhu yeshula',
  603: 'prabhu khrista krupamay mala tunchi ho ashray',
  604: 'divya teje prakashit sthal',
  605: 'yeshuchya rakte bharle dhunyache kund jan',
  606: 'kon mitra yeshuvani sare ojhe vahaya',
  607: 'yeshuchi seva avade gelo suveli tyakade',
  3096: 'majha yeshu mala priya far',
  3097: 'tujhsa koni nahi',
  3098: 'tarak to samarthya to',
  3099: 'tujhi daya sanatan aahe',
};

/**
 * Get canonical transliteration for a Marathi song by ID
 * Returns empty string if no canonical transliteration exists
 */
export function getCanonicalMarathiTransliteration(songId: number): string {
  return MARATHI_CANONICAL_TRANSLITERATIONS[songId] || '';
}

/**
 * Check if a song has a canonical transliteration
 */
export function hasCanonicalTransliteration(songId: number): boolean {
  return songId in MARATHI_CANONICAL_TRANSLITERATIONS;
}

/**
 * Get all song IDs with canonical transliterations
 */
export function getCanonicalTransliterationIds(): number[] {
  return Object.keys(MARATHI_CANONICAL_TRANSLITERATIONS).map(Number);
}
