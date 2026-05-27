import * as fs from 'fs';

// Carregar .env.local ANTES de qualquer outro import
const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

async function main() {
  console.log('=== Iniciando sincronização ===\n');
  console.log('Aguarde, isso pode levar alguns minutos...\n');

  // Import dinâmico após carregar variáveis de ambiente
  const { runSync } = await import('../src/lib/sienge/sync');

  try {
    const result = await runSync(({ step, detail, percent }) => {
      const pctStr = percent >= 0 ? `${percent}%` : 'ERRO';
      console.log(`[${pctStr}] ${step}: ${detail}`);
    });

    console.log('\n=== Resultado ===');
    console.log(result.message);
    
    if (result.details) {
      console.log('\nDetalhes:');
      console.log(JSON.stringify(result.details, null, 2));
    }
  } catch (error) {
    console.error('\nErro na sincronização:', error);
  }
}

main().catch(console.error);
