import { createServiceClient, createRegistrosClient } from '@/lib/supabase/server';
import { T } from '@/lib/supabase/tables';

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
  const supabase = createServiceClient();      // para .rpc() (funções ficam em public)
  const registrosDb = createRegistrosClient(); // para .from() das tabelas registros_*
  const details: Record<string, unknown> = {};

  const progress = (step: string, detail: string, percent: number) => {
    onProgress?.({ step, detail, percent });
  };

  const { data: logEntry } = await registrosDb
    .from(T.sync_logs)
    .insert({ status: 'running', registros_atualizados: 0 })
    .select()
    .single();

  try {
    // O valor pago agora é calculado AO VIVO na view registros_contratos
    // (não existe mais matview de valor pago pra dar refresh).

    // Manutenção: novos registros, contrato_id, data_gatilho
    progress('manutencao', 'Atualizando registros...', 60);
    const { data: resultado, error: manutError } = await supabase.rpc('registros_manutencao_diaria');
    if (manutError) {
      details.manutencao_error = manutError.message;
      progress('manutencao', `Erro na manutenção: ${manutError.message}`, 70);
    }

    const res = resultado ?? {};
    details.new_registros = res.novos_registros ?? 0;
    details.contrato_ids_atualizados = res.contrato_ids_atualizados ?? 0;
    details.gatilhos_setados = res.gatilhos_setados ?? 0;

    // Se houve erro na manutenção, marcar como erro
    if (manutError) {
      const erros = `Manutenção: ${manutError.message}`;
      details.error = erros;

      if (logEntry) {
        await registrosDb
          .from(T.sync_logs)
          .update({
            status: 'error',
            finished_at: new Date().toISOString(),
            detalhes: details,
          })
          .eq('id', logEntry.id);
      }

      progress('erro', `Erro: ${erros}`, -1);
      return {
        success: false,
        message: `Sincronização com erro: ${erros}`,
        details,
      };
    }

    // 3. Contar totais para o log
    progress('contagem', 'Verificando totais...', 85);
    const [empCount, lotesCount, contratosCount] = await Promise.all([
      registrosDb.from(T.empreendimentos).select('id', { count: 'exact', head: true }),
      registrosDb.from(T.lotes).select('id', { count: 'exact', head: true }),
      registrosDb.from(T.contratos).select('id', { count: 'exact', head: true }).eq('ativo', true),
    ]);
    details.enterprises_count = empCount.count ?? 0;
    details.units_count = lotesCount.count ?? 0;
    details.active_contracts = contratosCount.count ?? 0;

    const registrosAtualizados =
      (res.novos_registros ?? 0) +
      (res.contrato_ids_atualizados ?? 0) +
      (res.gatilhos_setados ?? 0);

    progress('salvando', 'Finalizando...', 95);

    if (logEntry) {
      await registrosDb
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
      await registrosDb
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
