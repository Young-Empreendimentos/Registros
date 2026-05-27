import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceKey, getSupabaseUrl } from '../../src/lib/supabase/config';
import { R, RPC, T } from '../../src/lib/supabase/tables';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnvLocal();

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
