import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

async function main() {
  console.log('=== Ingestão Sienge → Supabase TI ===\n');

  const { runSiengeIngest } = await import('../src/lib/sienge/ingest');

  const result = await runSiengeIngest(({ step, detail, percent }) => {
    const pctStr = percent >= 0 ? `${percent}%` : 'ERRO';
    console.log(`[${pctStr}] ${step}: ${detail}`);
  });

  console.log('\n=== Resultado ===');
  console.log(result.message);
  console.log(JSON.stringify(result.details, null, 2));
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
