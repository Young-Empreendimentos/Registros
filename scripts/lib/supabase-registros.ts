import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceKey, getSupabaseUrl } from '../../src/lib/supabase/config';
import { R, RPC, T } from '../../src/lib/supabase/tables';

function loadEnvLocal() {
  const candidates = ['.env.local', '.env'];
  for (const name of candidates) {
    const envPath = path.resolve(process.cwd(), name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^([^=]+)=(.*)$/);
      if (!m) continue;
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[m[1].trim()]) {
        process.env[m[1].trim()] = value;
      }
    }
  }
}

loadEnvLocal();

export { T, R, RPC };

function requireSupabaseConfig() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  const placeholders = ['your-service-role-key', 'your-anon-key', ''];
  if (!url || !key || placeholders.includes(key) || key.includes('your-')) {
    throw new Error(
      'Credenciais Supabase inválidas ou ausentes.\n' +
        'Seu .env.local ainda tem placeholders (your-service-role-key).\n\n' +
        'Copie do servidor (onde já funciona):\n' +
        '  scp root@5.161.255.208:/opt/registros/.env.local .env.local\n\n' +
        'Ou pegue em Supabase → Project Settings → API → service_role key\n' +
        'e preencha SUPABASE_TI_SERVICE_KEY e SUPABASE_SERVICE_ROLE_KEY.\n\n' +
        'Alternativa remota:\n' +
        '  .\\deploy\\sync-andamento-remoto.ps1'
    );
  }
  return { url, key };
}

export function createRegistrosClient() {
  const { url, key } = requireSupabaseConfig();
  return createClient(url, key);
}

/** Cliente do projeto legado (atfsixsamqwndwnfvpdy) — só para migração */
export function createLegacyClient() {
  const url = process.env.SUPABASE_LEGACY_URL;
  const key = process.env.SUPABASE_LEGACY_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
