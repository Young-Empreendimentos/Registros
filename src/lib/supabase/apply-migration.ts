/**
 * Script para aplicar migration no Supabase.
 * Executar: npx tsx src/lib/supabase/apply-migration.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://atfsixsamqwndwnfvpdy.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function applyMigration() {
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Applying ${statements.length} statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql_text: stmt });
    if (error) {
      console.error(`Error at statement ${i + 1}:`, error.message);
    }
  }

  console.log('Migration complete!');
}

applyMigration().catch(console.error);
