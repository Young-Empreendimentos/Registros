import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceKey, getSupabaseUrl } from '../../src/lib/supabase/config';
import { R, RPC, T } from '../../src/lib/supabase/tables';

config({ path: resolve(process.cwd(), '.env.local') });

export { T, R, RPC };

export function createRegistrosClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceKey());
}

/** Cliente do projeto legado (atfsixsamqwndwnfvpdy) — só para migração */
export function createLegacyClient() {
  const url = process.env.SUPABASE_LEGACY_URL;
  const key = process.env.SUPABASE_LEGACY_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
