import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const supabaseTI = createClient(
  process.env.SUPABASE_TI_URL!,
  process.env.SUPABASE_TI_SERVICE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== Debug Montecarlo ===\n');

  // 1. Buscar lotes do Montecarlo no nosso banco
  const { data: contratosNossos } = await supabase
    .from('contratos')
    .select(`
      numero_contrato, valor_ja_pago,
      lotes(numero, empreendimentos(sienge_id, nome))
    `)
    .eq('ativo', true)
    .limit(2000);

  const montecarloNossos = (contratosNossos || []).filter(c => {
    const lote = c.lotes as { empreendimentos: { sienge_id: number } } | null;
    return lote?.empreendimentos?.sienge_id === 2003;
  });

  console.log(`Contratos Montecarlo no nosso banco: ${montecarloNossos.length}`);
  console.log('Exemplos (numero_contrato | lote.numero):');
  for (const c of montecarloNossos.slice(0, 20)) {
    const lote = c.lotes as { numero: string };
    console.log(`  "${c.numero_contrato}" | "${lote?.numero}"`);
  }

  // 2. Buscar lotes do Montecarlo no TI
  console.log('\n\n=== Lotes do Montecarlo no TI ===');
  const allParcelas = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data } = await supabaseTI
      .from('sienge_parcelas_receber')
      .select('document_number, units')
      .eq('cost_center_id', 2003)
      .range(offset, offset + 999);
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allParcelas.push(...data);
      offset += 1000;
      if (data.length < 1000) hasMore = false;
    }
  }
  
  console.log(`Total parcelas Montecarlo no TI: ${allParcelas.length}`);
  
  const unitsUnicos = new Set<string>();
  for (const p of allParcelas) {
    const name = p.units?.[0]?.name;
    if (name) unitsUnicos.add(name);
  }
  
  console.log(`\nUnits únicos no TI Montecarlo (${unitsUnicos.size}):`);
  console.log([...unitsUnicos].sort().join(', '));
}

main().catch(console.error);
