import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.resolve(root, 'public', 'exports');

function loadEnv() {
  const envPath = path.resolve(root, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseDisplayToSections(display) {
  const sections = [];
  let current = null;

  for (const line of (display || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const marker = trimmed.match(/^\[([^\]]+)\]$/);
    if (marker) {
      if (current) sections.push(current);
      current = { type: 'verse', label: marker[1], lines: [] };
    } else {
      if (!current) current = { type: 'verse', label: 'Verse 1', lines: [] };
      current.lines.push({ text: trimmed });
    }
  }

  if (current) sections.push(current);
  return sections;
}

function writeTemporary(filePath, data, pretty = false) {
  fs.writeFileSync(`${filePath}.tmp`, JSON.stringify(data, null, pretty ? 2 : 0), 'utf8');
}

async function exportSongCatalog() {
  loadEnv();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Supabase song export failed: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  if (rows.length === 0) throw new Error('Supabase returned no active songs; export was not written.');

  const songs = rows.map(song => ({
    id: song.id,
    songNumber: song.song_number,
    title: song.title,
    artist: song.artist ?? undefined,
    composer: song.composer ?? undefined,
    language: song.language ?? undefined,
    originalKey: song.original_key ?? undefined,
    capo: song.capo ?? undefined,
    bpm: song.bpm ?? undefined,
    timeSignature: song.time_signature ?? undefined,
    hashtags: [],
    sections: parseDisplayToSections(song.display),
    chords: song.chords ?? undefined,
    display: song.display ?? '',
    lyrics: song.lyrics ?? undefined,
    is_active: song.is_active !== false,
    updated_at: song.updated_at ?? undefined,
  }));

  const missingDisplayCount = songs.filter(song => !song.display.trim()).length;
  if (missingDisplayCount > 0) {
    throw new Error(`${missingDisplayCount} active songs have no display content; export was not written.`);
  }

  const index = songs.map(song => ({
    id: song.id,
    songNumber: song.songNumber,
    title: song.title,
    artist: song.artist,
    language: song.language,
    originalKey: song.originalKey,
    hashtags: song.hashtags,
    searchTokens: `${song.title} ${song.artist || ''} ${song.language || ''}`.toLowerCase(),
    is_active: song.is_active,
  }));

  const version = createHash('sha256').update(JSON.stringify({ songs, index })).digest('hex');
  let generatedAt = new Date().toISOString();
  const existingManifestPath = path.join(outputDir, 'manifest.json');
  if (fs.existsSync(existingManifestPath)) {
    try {
      const previousManifest = JSON.parse(fs.readFileSync(existingManifestPath, 'utf8'));
      if (previousManifest.version === version && previousManifest.generatedAt) {
        generatedAt = previousManifest.generatedAt;
      }
    } catch {
      // Replace an invalid old manifest with a valid one.
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const allSongsPath = path.join(outputDir, 'all-songs.json');
  const indexPath = path.join(outputDir, 'index.json');
  const manifestPath = path.join(outputDir, 'manifest.json');
  const manifest = {
    version,
    generatedAt,
    songCount: songs.length,
  };

  writeTemporary(allSongsPath, songs);
  writeTemporary(indexPath, { songs: index }, true);
  writeTemporary(manifestPath, manifest, true);
  fs.renameSync(`${allSongsPath}.tmp`, allSongsPath);
  fs.renameSync(`${indexPath}.tmp`, indexPath);
  fs.renameSync(`${manifestPath}.tmp`, manifestPath);

  console.log(`Exported ${songs.length} active songs.`);
}

exportSongCatalog().catch(error => {
  console.error(error instanceof Error ? error.message : 'Song export failed.');
  process.exitCode = 1;
});