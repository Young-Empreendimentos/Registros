import { createRegistrosClient } from './lib/supabase-registros';

const supabase = createRegistrosClient();

async function consultar() {
  console.log('Consultando tabela sienge_parcelas_receber no banco do TI...\n');

  // Ver estrutura da tabela (primeiros registros)
  const { data, error, count } = await supabase
    .from('sienge_parcelas_receber')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.error('Erro ao consultar:', error);
    return;
  }

  console.log(`Total de registros: ${count}\n`);
  console.log('Estrutura dos dados (primeiros 5 registros):');
  console.log(JSON.stringify(data, null, 2));

  // Ver campos disponíveis
  if (data && data.length > 0) {
    console.log('\n\nCampos disponíveis:');
    console.log(Object.keys(data[0]));

    // Ver estrutura dos receipts
    if (data[0].receipts) {
      console.log('\nEstrutura dos receipts:');
      console.log(JSON.stringify(data[0].receipts, null, 2));
    }
  }
}

consultar().then(() => {
  console.log('\nConsulta concluída!');
  process.exit(0);
});
