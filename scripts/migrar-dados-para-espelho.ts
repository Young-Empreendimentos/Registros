/**
 * Copia dados do Supabase legado (atfsixsamqwndwnfvpdy) para o espelho Sienge
 * (vvtympzatclvjaqucebr), nas tabelas registros_*.
 *
 * Pré-requisitos:
 * 1. Rodar supabase-ti/migrations/002_registros_schema.sql no espelho
 * 2. .env.local com SUPABASE_TI_* apontando para o espelho
 * 3. SUPABASE_LEGACY_URL + SUPABASE_LEGACY_SERVICE_KEY do projeto antigo
 *
 * Uso: npm run migrar-dados-para-espelho
 */
import { createLegacyClient, createRegistrosClient, T } from './lib/supabase-registros';

const TABLES = [
  { legado: 'usuarios', destino: T.usuarios },
  { legado: 'empreendimentos', destino: T.empreendimentos },
  { legado: 'lotes', destino: T.lotes },
  { legado: 'contratos', destino: T.contratos },
  { legado: 'registros', destino: T.registros },
  { legado: 'comprovantes', destino: T.comprovantes },
  { legado: 'sync_logs', destino: T.sync_logs },
] as const;

const PAGE = 1000;

async function fetchAll(
  client: ReturnType<typeof createRegistrosClient>,
  table: string
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function upsertBatch(
  dest: ReturnType<typeof createRegistrosClient>,
  table: string,
  rows: Record<string, unknown>[]
) {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await dest.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

async function main() {
  const legacy = createLegacyClient();
  const dest = createRegistrosClient();

  if (!legacy) {
    console.error(
      'Defina SUPABASE_LEGACY_URL e SUPABASE_LEGACY_SERVICE_KEY no .env.local'
    );
    process.exit(1);
  }

  console.log('Destino:', process.env.SUPABASE_TI_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Legado:', process.env.SUPABASE_LEGACY_URL);

  for (const { legado, destino } of TABLES) {
    console.log(`\n→ ${legado} → ${destino}`);
    const rows = await fetchAll(legacy, legado);
    console.log(`  ${rows.length} linhas lidas`);
    if (rows.length === 0) continue;
    await upsertBatch(dest, destino, rows);
    console.log(`  ${rows.length} linhas gravadas`);
  }

  console.log('\nMigração concluída.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
