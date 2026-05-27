import { calcularGatilho, isGatilhoAtingido } from '@/lib/calculations';
import { createServiceClient } from '@/lib/supabase/server';
import { R, RPC, T } from '@/lib/supabase/tables';
import { ALLOWED_ENTERPRISE_IDS } from './constants';
import {
  sumValorRecebimentos,
  fetchContratosVendaTI,
  fetchContratoClientesTI,
  fetchClientesMapTI,
  fetchParcelasReceberTI,
  fetchUnidadesTI,
  fetchContractUnitLinksTI,
  getMainClienteId,
  isContratoAtivo,
  type TIParcelaReceber,
  type TIContratoVenda,
} from './ti-client';

// Interface para os dados de recebimentos do banco TI
type TIIncomeData = TIParcelaReceber;

// Extrai apenas os dígitos numéricos de um identificador de lote
// Exemplos:
//   "173" -> "173"
//   "173A" -> "173"
//   "Lote 173" -> "173"
//   "Lote 02" -> "2"
//   "CT.36" -> "36"
//   "ADT.Lote 79" -> "79"
function extrairNumeroLote(input: string | undefined | null): string {
  if (!input) return '';
  const match = input.match(/\d+/);
  if (!match) return '';
  return String(parseInt(match[0], 10));
}

// Extrai número + letra opcional do final
// Exemplos:
//   "173" -> "173"
//   "173A" -> "173A"
//   "Lote 02" -> "2"
//   "CT.36" -> "36"
//   "CT.190A" -> "190A"
//   "190B" -> "190B"
function extrairNumeroComLetra(input: string | undefined | null): string {
  if (!input) return '';
  // Pega número seguido opcionalmente de uma letra
  const match = input.match(/(\d+)([A-Z]?)/i);
  if (!match) return '';
  const num = String(parseInt(match[1], 10));
  const letra = (match[2] || '').toUpperCase();
  return num + letra;
}

// Calcula valor pago real somando receipts[].value onde type = 'Recebimento'
// (valor da parcela, sem juros e multa)
// IMPORTANTE: Quando um lote tem múltiplos contratos (ex: 190 e 190A),
// o TI mantém units[0].name = "190" mas usa document_number = "CT.190" ou "CT.190A".
// O match é feito identificando o ID alvo (com letra se houver) e filtrando
// os document_numbers correspondentes.
function calculateRealPaidValueFromTI(
  incomeItems: TIIncomeData[],
  enterpriseId: number,
  ...loteCandidatos: (string | undefined | null)[]
): number {
  // Identifica o ID alvo, priorizando o que tem letra (mais específico)
  let idAlvoComLetra: string | null = null;
  let idAlvoSemLetra: string | null = null;
  
  for (const candidato of loteCandidatos) {
    const id = extrairNumeroComLetra(candidato);
    if (!id) continue;
    if (/[A-Z]$/i.test(id)) {
      if (!idAlvoComLetra) idAlvoComLetra = id;
    } else {
      if (!idAlvoSemLetra) idAlvoSemLetra = id;
    }
  }
  
  const idAlvo = idAlvoComLetra || idAlvoSemLetra;
  if (!idAlvo) return 0;
  
  const numAlvo = idAlvo.replace(/[A-Z]$/i, '');
  const temLetra = /[A-Z]$/i.test(idAlvo);

  // Filtra itens deste empreendimento cujo unit name (número base) bate
  const itensDoLote = incomeItems.filter(item => {
    if (item.cost_center_id !== enterpriseId) return false;
    if (!item.units || item.units.length === 0) return false;
    return extrairNumeroLote(item.units[0]?.name) === numAlvo;
  });
  
  if (itensDoLote.length === 0) return 0;
  
  // Tenta match exato pelo document_number (considerando letra)
  const matchExato = itensDoLote.filter(item => 
    extrairNumeroComLetra(item.document_number) === idAlvo
  );
  
  if (matchExato.length > 0) {
    let valorPago = 0;
    for (const item of matchExato) {
      valorPago += sumValorRecebimentos(item.receipts);
    }
    return valorPago;
  }
  
  // Sem match exato no document_number
  // Verifica se há outros document_numbers com letra para esse lote
  // (isso indica que existem múltiplos contratos para o mesmo lote)
  const temOutrosComLetra = itensDoLote.some(item => {
    const docId = extrairNumeroComLetra(item.document_number);
    return /[A-Z]$/i.test(docId);
  });
  
  if (temOutrosComLetra && temLetra) {
    // Nosso ID tem letra (ex: 190B) mas o TI não tem CT.190B - contrato não existe
    return 0;
  }
  
  // Sem ambiguidade - soma todos os itens do lote
  let valorPago = 0;
  for (const item of itensDoLote) {
    valorPago += sumValorRecebimentos(item.receipts);
  }
  return valorPago;
}

export type ProgressCallback = (event: {
  step: string;
  detail: string;
  percent: number;
}) => void;

export async function runSync(
  onProgress?: ProgressCallback
): Promise<{
  success: boolean;
  message: string;
  details: Record<string, unknown>;
}> {
  const supabase = createServiceClient();
  const details: Record<string, unknown> = {};
  let registrosAtualizados = 0;

  const progress = (step: string, detail: string, percent: number) => {
    onProgress?.({ step, detail, percent });
  };

  const { data: logEntry } = await supabase
    .from(T.sync_logs)
    .insert({ status: 'running', registros_atualizados: 0 })
    .select()
    .single();

  try {
    const allowedIds = Array.from(ALLOWED_ENTERPRISE_IDS);

    // 1. Carregar contratos do banco TI (fonte principal de dados cadastrais)
    progress('contratos', 'Carregando contratos do banco de dados Supabase...', 2);
    const tiContratos = await fetchContratosVendaTI(allowedIds);
    details.contracts_count = tiContratos.length;

    // Empreendimentos derivados dos contratos TI
    const empMap = new Map<number, string>();
    for (const c of tiContratos) {
      if (!empMap.has(c.enterprise_id)) {
        empMap.set(c.enterprise_id, c.enterprise_name);
      }
    }
    for (const [id, name] of empMap) {
      await supabase.from(T.empreendimentos).upsert(
        { sienge_id: id, nome: name },
        { onConflict: 'sienge_id' }
      );
    }
    details.enterprises_count = empMap.size;
    progress('empreendimentos', `${empMap.size} empreendimentos carregados do Supabase`, 8);

    // 2. Unidades do banco TI (populadas pela ingestão diária da API Sienge)
    progress('unidades', 'Carregando unidades do banco TI...', 10);
    const tiUnidades = await fetchUnidadesTI(allowedIds);
    details.units_count = tiUnidades.length;

    const unitsByEnterprise = new Map<number, typeof tiUnidades>();
    for (const unit of tiUnidades) {
      const list = unitsByEnterprise.get(unit.enterprise_id) || [];
      list.push(unit);
      unitsByEnterprise.set(unit.enterprise_id, list);
    }

    for (const [entId, units] of unitsByEnterprise) {
      const { data: empRow } = await supabase
        .from(T.empreendimentos)
        .select('id')
        .eq('sienge_id', entId)
        .single();

      if (!empRow) continue;

      for (const unit of units) {
        let numeroLote = unit.name;
        const loteMatch = numeroLote.match(/[Ll]ote\s*(\d+)/);
        if (loteMatch) {
          numeroLote = loteMatch[1];
        } else {
          const onlyNumber = numeroLote.match(/^(\d+)$/);
          if (onlyNumber) {
            numeroLote = onlyNumber[1];
          } else {
            const hasNumber = numeroLote.match(/\d+/);
            if (!hasNumber || numeroLote.match(/[A-Za-z]{2,}/)) {
              continue;
            }
            numeroLote = hasNumber[0];
          }
        }

        await supabase.from(T.lotes).upsert(
          {
            sienge_unit_id: unit.id,
            numero: numeroLote,
            empreendimento_id: empRow.id,
            valor_avista: unit.terrain_value || 0,
          },
          { onConflict: 'sienge_unit_id' }
        );
      }
    }
    progress('unidades', `${tiUnidades.length} unidades carregadas do Supabase`, 35);

    // 3. Vínculos contrato-unidade do banco TI
    progress('vinculos', 'Carregando vínculos contrato-unidade do Supabase...', 37);
    let contractUnitLinks: Map<number, number>;
    try {
      contractUnitLinks = await fetchContractUnitLinksTI();
      details.contract_unit_links = contractUnitLinks.size;
    } catch (err) {
      details.contract_unit_links_error = err instanceof Error ? err.message : 'Erro ao buscar vínculos';
      contractUnitLinks = new Map();
    }
    progress('vinculos', `${contractUnitLinks.size} vínculos contrato-unidade carregados`, 42);

    // Agrupar contratos ativos por unidade (contrato mais recente por lote)
    const activeContractsByUnit = new Map<number, TIContratoVenda>();
    for (const contrato of tiContratos) {
      if (!isContratoAtivo(contrato)) continue;
      const unitId = contractUnitLinks.get(contrato.id);
      if (!unitId) continue;
      const existing = activeContractsByUnit.get(unitId);
      if (!existing || new Date(contrato.contract_date) > new Date(existing.contract_date)) {
        activeContractsByUnit.set(unitId, contrato);
      }
    }

    const activeContracts = Array.from(activeContractsByUnit.entries());
    details.active_contracts = activeContracts.length;
    progress('processando', `Processando ${activeContracts.length} contratos ativos...`, 45);

    // 4. Clientes e recebimentos do banco TI
    progress('clientes', 'Carregando clientes do banco de dados Supabase...', 46);
    const [contratoClientes, clientesMap] = await Promise.all([
      fetchContratoClientesTI(),
      fetchClientesMapTI(),
    ]);
    details.clientes_count = clientesMap.size;
    progress('clientes', `${clientesMap.size} clientes carregados do Supabase`, 47);

    progress('recebimentos', 'Carregando recebimentos do banco de dados Supabase...', 48);
    let allIncomeData: TIIncomeData[] = [];
    try {
      allIncomeData = await fetchParcelasReceberTI(allowedIds);
      details.income_count = allIncomeData.length;
    } catch (err) {
      details.income_error = err instanceof Error ? err.message : 'Erro ao buscar recebimentos do TI';
    }
    progress('recebimentos', `${allIncomeData.length} parcelas carregadas do Supabase`, 50);

    // 5. Processar cada contrato ativo
    for (let i = 0; i < activeContracts.length; i++) {
      const [unitSiengeId, tiContrato] = activeContracts[i];
      if (i % 20 === 0) {
        const pct = 50 + Math.round((i / activeContracts.length) * 42);
        progress('salvando', `Salvando contratos: ${i + 1}/${activeContracts.length}`, pct);
      }

      const clienteId = getMainClienteId(contratoClientes, tiContrato.id);
      const cliente = clienteId ? clientesMap.get(clienteId) : null;
      const clienteNome = cliente?.name || '';
      const clienteEmail = cliente?.email || '';

      const { data: loteRow } = await supabase
        .from(T.lotes)
        .select('id, numero')
        .eq('sienge_unit_id', unitSiengeId)
        .maybeSingle();

      if (!loteRow) continue;

      const enterpriseId = tiContrato.enterprise_id;
      const paidValue = allIncomeData.length > 0
        ? calculateRealPaidValueFromTI(allIncomeData, enterpriseId, tiContrato.number, loteRow.numero)
        : 0;

      const { data: existingContrato } = await supabase
        .from(T.contratos)
        .select('id, valor_ja_pago')
        .eq('sienge_contract_id', tiContrato.id)
        .maybeSingle();

      const valorPagoFinal = paidValue > 0
        ? paidValue
        : (existingContrato?.valor_ja_pago ?? 0);

      const payload: Record<string, unknown> = {
        sienge_contract_id: tiContrato.id,
        lote_id: loteRow.id,
        cliente_nome: clienteNome,
        cliente_email: clienteEmail,
        valor_total: tiContrato.total_selling_value,
        valor_ja_pago: valorPagoFinal,
        data_contrato: tiContrato.contract_date,
        ativo: true,
        numero_contrato: tiContrato.number,
      };

      if (paidValue > 0 || !existingContrato) {
        payload.ultima_atualizacao_valor = new Date().toISOString();
      }

      const { data: contratoRow, error: upsertError } = await supabase
        .from(T.contratos)
        .upsert(payload, { onConflict: 'sienge_contract_id' })
        .select()
        .maybeSingle();

      if (upsertError) {
        console.error(`Erro ao salvar contrato ${tiContrato.id}:`, upsertError.message);
        continue;
      }
      if (!contratoRow) continue;

      const { data: existingRegistro } = await supabase
        .from(T.registros)
        .select('id, data_gatilho')
        .eq('lote_id', loteRow.id)
        .maybeSingle();

      if (!existingRegistro) {
        await supabase.from(T.registros).insert({
          lote_id: loteRow.id,
          contrato_id: contratoRow.id,
        });
      } else {
        const updates: Record<string, unknown> = { contrato_id: contratoRow.id };
        const gatilho = calcularGatilho(contratoRow);
        const atingido = isGatilhoAtingido(contratoRow, gatilho);
        if (atingido && !existingRegistro.data_gatilho) {
          updates.data_gatilho = new Date().toISOString().split('T')[0];
        }
        await supabase
          .from(T.registros)
          .update(updates)
          .eq('id', existingRegistro.id);
      }

      registrosAtualizados++;
    }
    progress('salvando', `${registrosAtualizados} contratos processados`, 93);

    // 5. Mark contracts as inactive if no longer in active list
    progress('finalizando', 'Atualizando status dos contratos...', 94);
    const activeSiengeIds = Array.from(activeContractsByUnit.values()).map((c) => c.id);
    if (activeSiengeIds.length > 0) {
      await supabase
        .from(T.contratos)
        .update({ ativo: false })
        .not('sienge_contract_id', 'in', `(${activeSiengeIds.join(',')})`);
    }

    // 6. Create registros for lotes without one
    progress('finalizando', 'Criando registros para novos lotes...', 96);
    const { data: lotesWithoutRegistro } = await supabase.rpc(RPC.get_lotes_without_registros);
    if (lotesWithoutRegistro) {
      for (const lote of lotesWithoutRegistro) {
        await supabase.from(T.registros).insert({
          lote_id: lote.id,
          contrato_id: null,
        });
      }
      details.new_registros = lotesWithoutRegistro.length;
    }

    // 7. Atualizar valores pagos de TODOS os contratos existentes usando dados do banco TI
    // Isso garante que mesmo contratos que não vieram na busca de sales-contracts sejam atualizados
    if (allIncomeData.length > 0) {
      progress('valores', 'Atualizando valores pagos de todos os contratos...', 97);
      
      const { data: todosContratos } = await supabase
        .from(T.contratos)
        .select('id, sienge_contract_id, valor_ja_pago, numero_contrato, lotes(numero, empreendimentos(sienge_id))')
        .eq('ativo', true);

      let valoresAtualizados = 0;
      
      if (todosContratos) {
        for (const contrato of todosContratos) {
          type LoteJoin = {
            numero: string;
            registros_empreendimentos: { sienge_id: number };
          };
          const lote = (contrato as Record<string, unknown>)[R.lotes] as LoteJoin | null;
          if (!lote?.registros_empreendimentos?.sienge_id) continue;

          const enterpriseId = lote.registros_empreendimentos.sienge_id;
          const numeroContrato = (contrato as { numero_contrato?: string }).numero_contrato;
          
          if (!numeroContrato && !lote.numero) continue;
          
          // Passa AMBOS como candidatos para garantir match
          const valorCalculado = calculateRealPaidValueFromTI(
            allIncomeData,
            enterpriseId,
            numeroContrato,
            lote.numero
          );
          const valorAtual = contrato.valor_ja_pago || 0;
          
          // Só atualiza se:
          // 1. O valor calculado é maior que 0 (há dados no TI)
          // 2. Há diferença significativa em relação ao valor atual
          if (valorCalculado > 0 && Math.abs(valorCalculado - valorAtual) > 0.01) {
            await supabase
              .from(T.contratos)
              .update({ 
                valor_ja_pago: valorCalculado,
                ultima_atualizacao_valor: new Date().toISOString()
              })
              .eq('id', contrato.id);
            valoresAtualizados++;
          }
        }
      }
      
      details.valores_atualizados = valoresAtualizados;
      progress('valores', `${valoresAtualizados} valores de contratos atualizados`, 99);
    }

    // Update log
    if (logEntry) {
      await supabase
        .from(T.sync_logs)
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          registros_atualizados: registrosAtualizados,
          detalhes: details,
        })
        .eq('id', logEntry.id);
    }

    progress('concluido', `Sincronização concluída! ${registrosAtualizados} registros atualizados.`, 100);

    return {
      success: true,
      message: `Sincronização concluída. ${registrosAtualizados} registros atualizados.`,
      details,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    details.error = errorMessage;

    if (logEntry) {
      await supabase
        .from(T.sync_logs)
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          detalhes: details,
        })
        .eq('id', logEntry.id);
    }

    progress('erro', `Erro: ${errorMessage}`, -1);

    return {
      success: false,
      message: `Erro na sincronização: ${errorMessage}`,
      details,
    };
  }
}
