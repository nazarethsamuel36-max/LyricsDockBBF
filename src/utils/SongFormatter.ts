export function formatSongTitle(title: string): string {
  if (!title) return '';
  
  // 1. Strip leading and trailing asterisks, hyphens, underscores and extra whitespace
  let clean = normalizeImportedText(title)
    .replace(/^[\s\*\-\_]+/, '')
    .replace(/[\s\*\-\_]+$/, '')
    .trim();

  // 2. Check if text contains non-Latin scripts (Hindi/Devanagari, etc.)
  // If it does, skip title-case formatting as it corrupts these scripts
  const devanagariRegex = /[\u0900-\u097F]/;
  if (devanagariRegex.test(clean)) {
    return clean;
  }

  // 3. Convert to Title Case (Latin scripts only)
  const minorWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with']);
  
  const words = clean.split(/\s+/);
  const formattedWords = words.map((word, idx) => {
    const lower = word.toLowerCase();
    // Always capitalize the first and last word
    if (idx === 0 || idx === words.length - 1) {
      return capitalizeWord(word);
    }
    if (minorWords.has(lower)) {
      return lower;
    }
    return capitalizeWord(word);
  });
  
  return formattedWords.join(' ');
}

export function normalizeImportedText(value: string | undefined): string {
  if (!value) return '';

  return value
    // Double UTF-8 encoding artifacts (mojibake)
    .replace(/aÌ‚â‚¬â„¢/g, "'")
    .replace(/aÌ‚â‚¬Å“/g, '"')
    .replace(/aÌ‚â‚¬Â/g, '"')
    // Single UTF-8 encoding artifacts
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€/g, "'")
    .replace(/â€/g, "'")
    .replace(/â€/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€”/g, '-')
    .replace(/â€“/g, '-')
    .replace(/â€"/g, '-')
    .replace(/â€–/g, '-')
    .replace(/â€¦/g, '...')
    // Smart quotes normalization
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function capitalizeWord(word: string): string {
  if (!word) return '';
  // Check for internal capitals (e.g. "I've", "PWA")
  const rest = word.slice(1);
  if (rest !== rest.toLowerCase() && rest !== rest.toUpperCase()) {
    return word; // Preserve camelCase or mixed case
  }
  // Convert all-caps or all-lowercase to title capitalized word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function formatKey(key: string | undefined): string {
  if (!key) return 'C';
  return normalizeImportedText(key).replace(/[\s\*\-\_]+/g, '').trim();
}

export function formatSongNumber(language?: string, songNumber?: number): string {
  if (songNumber === undefined || songNumber === null) return '';
  if (!language) return `${songNumber}`;
  
  const langLower = language.toLowerCase().trim();
  let prefix = 'Eng';
  
  if (langLower.startsWith('eng')) prefix = 'Eng';
  else if (langLower.startsWith('hin')) prefix = 'Hin';
  else if (langLower.startsWith('mar')) prefix = 'Mar';
  else if (langLower.startsWith('ben')) prefix = 'Ben';
  else if (langLower.startsWith('kon')) prefix = 'Kon';
  else prefix = language.slice(0, 3).charAt(0).toUpperCase() + language.slice(1, 3).toLowerCase();

  return `${prefix} ${songNumber}`;
}

