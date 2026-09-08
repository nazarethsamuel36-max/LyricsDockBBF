import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export const supabase: SupabaseClient;
export function ensureAuthenticated(): Promise<User>;
