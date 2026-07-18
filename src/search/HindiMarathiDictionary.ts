/**
 * Hindi & Marathi Romanization Dictionary
 *
 * Purpose: Map all common romanization variants of the SAME Devanagari word
 * to a single canonical form, so that searching any spelling finds the same song.
 *
 * This is NOT a synonym/thesaurus dictionary.
 * This is NOT about grammar.
 *
 * It answers one question:
 *   "यहोवा typed in English letters" → yahova / yehova / jehova / yahovah → all → "yahova"
 *
 * Structure:
 *   canonical: [variant1, variant2, ...]
 *
 * Rule: The canonical is the most common spelling found in your actual song data.
 * All variants (including the canonical itself) map to the canonical form.
 *
 * Languages covered: Hindi, Marathi (Devanagari-origin words romanized)
 */

// Each entry: canonical form → all other romanization variants of the SAME word
export const HINDI_MARATHI_ROMANIZATION: Record<string, string[]> = {

  // ══════════════════════════════════════════════════════
  // GOD NAMES & TITLES
  // ══════════════════════════════════════════════════════

  // येशु (Yeshu - Jesus)
  'yeshu': ['yesu', 'yeshoo', 'yeesu', 'yesh', 'yezu', 'jezu', 'jeshu', 'ieshu'],

  // यहोवा (Yahova - Jehovah)
  'yahova': ['yehova', 'jehova', 'yehovah', 'yahovah', 'jehovah', 'yahweh', 'yahveh'],

  // प्रभु (Prabhu - Lord)
  'prabhu': ['prabu', 'prabhoo', 'prabhuu', 'praboo', 'prabhu'],

  // मसीह (Masih - Messiah/Christ)
  'masih': ['masiha', 'maseeh', 'mashih', 'masihi', 'masihtu'],

  // खिस्त / ख्रिस्त (Khrista - Christ)
  'khrista': ['khrist', 'krista', 'christa', 'christ', 'kristh', 'khristace'],

  // ईश्वर (Ishwar - God)
  'ishwar': ['ishvar', 'iishvar', 'ishvara', 'eeshwar'],

  // भगवान (Bhagwan - God)
  'bhagwan': ['bhagavan', 'bhagvaan', 'bhagwan'],

  // परमेश्वर (Parmeshwar - Almighty God)
  'parameshwar': ['parmeshwar', 'parameshvara', 'parameswar'],

  // राजा (Raja - King)
  'raja': ['raajaa', 'raaja'],

  // पिता (Pita - Father)
  'pita': ['pitaa', 'pita'],

  // खुदा (Khuda - God, Urdu origin)
  'khuda': ['khudaa', 'khudaki'],

  // ══════════════════════════════════════════════════════
  // WORSHIP & PRAISE WORDS
  // ══════════════════════════════════════════════════════

  // आराधना (Aradhana - Worship)
  'aradhana': ['aaradhana', 'aradhan', 'aaradhan', 'aradhna', 'aaradhna', 'aaradhana'],

  // स्तुति (Stuti - Praise)
  'stuti': ['stooti', 'stutii', 'stuti'],

  // महिमा (Mahima - Glory)
  'mahima': ['mahimaa', 'mahimma', 'mahimah'],

  // हल्लेलूयाह (Hallelujah)
  'hallelujah': ['halleluya', 'halleluja', 'alleluia', 'allelujah', 'halleluyah', 'allelujah', 'alleluiah'],

  // धन्यवाद (Dhanyavad - Thanksgiving)
  'dhanyavad': ['dhanyawad', 'dhanyabad', 'dhanyavaad', 'dhanyawaad', 'dhanyavada'],

  // वन्दना (Vandna - Worship/Adoration)
  'vandna': ['vandana', 'vandna', 'vanda', 'vande'],

  // प्रशंसा (Prashansa - Praise)
  'prashansa': ['prashansa', 'prashansa'],

  // ══════════════════════════════════════════════════════
  // SPIRITUAL CONCEPTS
  // ══════════════════════════════════════════════════════

  // आत्मा (Atma - Soul/Spirit)
  'atma': ['aatma', 'atmaa', 'aatmaa'],

  // पवित्र (Pavitra - Holy)
  'pavitra': ['pawitra', 'paviter', 'pavitr'],

  // जीवन (Jeevan - Life)
  'jeevan': ['jivan', 'jiwan', 'jeewan', 'jeevan'],

  // स्वर्ग (Swarg - Heaven)
  'swarg': ['swarga', 'svarg', 'swarg', 'svarga'],

  // स्वर्गीय (Swargiya - Heavenly)
  'swargiya': ['svargiya', 'swargi', 'svargi'],

  // आकाश (Aakash - Sky/Heavens)
  'aakash': ['akash', 'aakaash', 'akaash'],

  // आसमान (Aasman - Sky, Urdu)
  'aasman': ['asman', 'aasmanon', 'asmanon'],

  // क्रूस (Krus - Cross)
  'krus': ['kruus', 'kroos', 'krusas', 'krusasa', 'kruss', 'krus'],

  // रक्त (Rakt - Blood)
  'rakt': ['rakta', 'rakte', 'raktaa', 'raktam', 'lahu', 'lahoo'],

  // मुक्ति (Mukti - Salvation/Freedom)
  'mukti': ['muktii', 'moksha', 'chutkara', 'uddhar'],

  // आनंद (Anand - Joy)
  'anand': ['aanand', 'ananda', 'anande', 'aanandit'],

  // शक्ति (Shakti - Power/Strength)
  'shakti': ['shakthi', 'sakti', 'sakthi'],

  // कृपा (Krupa/Kripa - Grace)
  'krupa': ['kripe', 'krupae', 'kripa', 'kripaa', 'krpamaya', 'krpeci'],

  // प्रेम (Prem - Love)
  'prem': ['premii', 'premi'],

  // प्यार (Pyar - Love, Urdu)
  'pyar': ['pyaar', 'pyara', 'pyare', 'pyari', 'pyaro', 'pyasi'],

  // दया (Daya - Mercy/Compassion)
  'daya': ['dayaa', 'daia', 'dayalu'],

  // विश्वास (Vishwas - Faith/Trust)
  'vishwas': ['vishvaas', 'vishwas'],

  // प्रार्थना (Prarthna - Prayer)
  'prarthna': ['prarthana', 'praarthna', 'praarthana'],

  // ══════════════════════════════════════════════════════
  // MARATHI-SPECIFIC WORDS
  // ══════════════════════════════════════════════════════

  // माझा (Majha - My, Marathi)
  'majha': ['mazha', 'maajha', 'maja'],

  // तुझा (Tujha - Your, Marathi)
  'tujha': ['tuzha', 'tujhaa'],

  // तुझी (Tujhi - Your feminine, Marathi)
  'tujhi': ['tuzhi', 'tujhee'],

  // आम्ही (Amhi - We, Marathi)
  'amhi': ['aamhi', 'aamhee'],

  // सर्व (Sarva - All, Marathi)
  'sarva': ['sarva', 'sarvanca', 'sarvache'],

  // मेंढपाळ (Mendhpal - Shepherd, Marathi)
  'mendhpal': ['mendhapal', 'mendhapala', 'mendhapal'],

  // करूया (Karuya - Let us do, Marathi)
  'karuya': ['karuia', 'kariya', 'karuya'],

  // ══════════════════════════════════════════════════════
  // HINDI WORDS WITH COMMON VARIANT SPELLINGS
  // ══════════════════════════════════════════════════════

  // नाम (Naam - Name)
  'naam': ['naame', 'nama', 'nam'],

  // गीत (Geet - Song)
  'geet': ['git', 'geeta', 'gita'],

  // सेवा (Seva - Service)
  'seva': ['sewa', 'sevaa'],

  // ज्योति (Jyoti - Light/Flame)
  'jyoti': ['joti', 'jyotii'],

  // उद्धार (Uddhar - Salvation)
  'uddhar': ['uddhaar', 'uddhar'],

  // पाप (Paap - Sin)
  'paap': ['paapi', 'paapon', 'pap'],

  // आशीष (Ashish - Blessing)
  'ashish': ['aashish', 'ashishon', 'ashis'],

  // तारा (Tara - Star / Savior)
  'tarak': ['taraka', 'taranara', 'taranahara'],

  // शरण (Sharan - Refuge/Shelter)
  'sharan': ['sharaN', 'sharana', 'sharan'],

  // दुनिया (Duniya - World)
  'duniya': ['dunia', 'duniyaa'],

  // ज़िंदगी (Zindagi - Life, Urdu)
  'zindagi': ['zindagii', 'zindagi'],

  // ══════════════════════════════════════════════════════
  // DOUBLE-VOWEL VARIANTS (aa = a, oo = u, ee = i)
  // These catch the most common romanization differences
  // ══════════════════════════════════════════════════════

  // आशा (Aasha - Hope)
  'aasha': ['asha', 'aashaa'],

  // आज (Aaj - Today)
  'aaj': ['aj'],

  // आग (Aag - Fire)
  'aag': ['ag'],

  // आधार (Aadhaar - Foundation)
  'aadhaar': ['aadhar', 'adhaar', 'adhar'],

};

/**
 * Build a reverse lookup map: variant → canonical
 * e.g. "yehova" → "yahova", "prabhoo" → "prabhu"
 */
function buildReverseMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [canonical, variants] of Object.entries(HINDI_MARATHI_ROMANIZATION)) {
    // The canonical form maps to itself
    map.set(canonical, canonical);
    // Every variant maps to the canonical
    for (const variant of variants) {
      map.set(variant.toLowerCase(), canonical);
    }
  }
  return map;
}

const REVERSE_MAP = buildReverseMap();

/**
 * Compute the Levenshtein edit distance between two strings.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Find the closest spelling match in our dictionary using Levenshtein distance.
 * Returns the canonical form if a close match (typo) is detected.
 */
function findClosestTypoMatch(token: string): string | null {
  const term = token.toLowerCase();
  if (term.length < 4) return null; // Ignore tiny words for typo correction to avoid false matches
  
  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  
  // Define acceptable distance threshold based on word length
  const maxThreshold = term.length > 6 ? 2 : 1; 

  for (const [variant, canonical] of REVERSE_MAP.entries()) {
    // Exact match already checked by caller, skip
    if (variant === term) continue;
    
    // Quick heuristic: length difference must be small
    if (Math.abs(variant.length - term.length) > maxThreshold) continue;
    
    const distance = getLevenshteinDistance(term, variant);
    if (distance <= maxThreshold && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = canonical;
    }
  }
  
  return bestMatch;
}

/**
 * Normalize a single token to its canonical romanization form.
 * Returns the original token if no mapping exists, but checks for typos
 * using Levenshtein distance.
 *
 * Example:
 *   canonicalizeToken("prabhoo") → "prabhu"
 *   canonicalizeToken("prabhhu") → "prabhu" (Levenshtein typo match)
 *   canonicalizeToken("yehova")  → "yahova"
 *   canonicalizeToken("hello")   → "hello"  (no mapping)
 */
/**
 * Canonicalize a token WITH Levenshtein typo correction.
 * Use ONLY for short user queries — NOT for indexing large lyric text.
 */
export function canonicalizeToken(token: string): string {
  const cleanToken = token.toLowerCase();
  
  // 1. Direct dictionary match
  const directMatch = REVERSE_MAP.get(cleanToken);
  if (directMatch) return directMatch;
  
  // 2. Levenshtein typo-correction match (safe only for short user input)
  const typoMatch = findClosestTypoMatch(cleanToken);
  if (typoMatch) {
    console.log(`[Levenshtein] Corrected typo "${token}" → canonical "${typoMatch}"`);
    return typoMatch;
  }
  
  return cleanToken;
}

/**
 * Canonicalize a token WITHOUT Levenshtein — dictionary exact/variant match only.
 * Use during indexing of large text (lyrics, titles) to avoid O(n*dict) slowdown.
 */
export function canonicalizeTokenFast(token: string): string {
  const cleanToken = token.toLowerCase();
  return REVERSE_MAP.get(cleanToken) ?? cleanToken;
}

/**
 * Canonicalize a full text string for INDEXING purposes.
 * Does NOT run Levenshtein — safe for long lyric strings.
 */
export function canonicalizeForIndex(text: string): string {
  const tokens = text.toLowerCase().trim().split(/\s+/);
  return tokens.map(canonicalizeTokenFast).join(' ');
}

/**
 * Normalize a full search query string by replacing all romanization
 * variants with their canonical forms.
 *
 * Example:
 *   canonicalizeQuery("prabhoo yehova ki stutii")
 *   → "prabhu yahova ki stuti"
 */
/**
 * Canonicalize a user search query string WITH Levenshtein typo correction.
 * Safe only for short queries (user input), NOT for indexing.
 */
export function canonicalizeQuery(query: string): string {
  const tokens = query.toLowerCase().trim().split(/\s+/);
  return tokens.map(canonicalizeToken).join(' ');
}

/**
 * Get all known variants for a canonical word (for debug/display).
 */
export function getVariants(canonical: string): string[] {
  return HINDI_MARATHI_ROMANIZATION[canonical] ?? [];
}

/**
 * Check if a word is a known romanization variant (or canonical).
 */
export function isKnownVariant(word: string): boolean {
  return REVERSE_MAP.has(word.toLowerCase());
}

console.log(
  `[HindiMarathiDictionary] Loaded ${REVERSE_MAP.size} romanization mappings ` +
  `across ${Object.keys(HINDI_MARATHI_ROMANIZATION).length} canonical words`
);

