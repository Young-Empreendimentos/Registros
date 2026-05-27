import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

async function main() {
  console.log('=== Pipeline diário: Sienge API → TI → Registros ===\n');

  const { runSiengeIngest } = await import('../src/lib/sienge/ingest');
  const { runSync } = await import('../src/lib/sienge/sync');

  console.log('--- Etapa 1: Ingestão Sienge → TI ---\n');
  const ingest = await runSiengeIngest(({ step, detail, percent }) => {
    console.log(`[ingest ${percent}%] ${step}: ${detail}`);
  });

  if (!ingest.success) {
    console.error('\nIngestão falhou:', ingest.message);
    process.exit(1);
  }

  console.log('\n--- Etapa 2: Sync TI → Sistema de Registros ---\n');
  const sync = await runSync(({ step, detail, percent }) => {
    console.log(`[sync ${percent}%] ${step}: ${detail}`);
  });

  console.log('\n=== Pipeline concluído ===');
  console.log('Ingest:', ingest.message);
  console.log('Sync:', sync.message);
  process.exit(sync.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
