import { createClient } from '@supabase/supabase-js';

console.log('🔑 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('🔑 Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

console.log('🔑 Supabase Key verification:');
console.log(JSON.stringify(import.meta.env.VITE_SUPABASE_ANON_KEY));
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY.length);
console.log(
  import.meta.env.VITE_SUPABASE_ANON_KEY.charCodeAt(
    import.meta.env.VITE_SUPABASE_ANON_KEY.length - 1
  )
);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE KEYS ARE MISSING OR BROKEN');
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
