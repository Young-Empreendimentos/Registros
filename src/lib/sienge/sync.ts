import { createServiceClient } from '@/lib/supabase/server';
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
  const supabase = createServiceClient();
  const details: Record<string, unknown> = {};

  const progress = (step: string, detail: string, percent: number) => {
    onProgress?.({ step, detail, percent });
  };

  const { data: logEntry } = await supabase
    .from(T.sync_logs)
    .insert({ status: 'running', registros_atualizados: 0 })
    .select()
    .single();

  try {
    // 1. Refresh da materialized view de valor_ja_pago
    progress('refresh', 'Atualizando valores pagos...', 10);
    const { error: mvError } = await supabase.rpc('registros_refresh_mv_valor_pago');
    if (mvError) {
      details.refresh_error = mvError.message;
      progress('refresh', `Erro no refresh: ${mvError.message}`, 20);
    } else {
      progress('refresh', 'Valores pagos atualizados', 50);
    }

    // 2. Manutenção: novos registros, contrato_id, data_gatilho
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

    // Se houve erro em algum passo crítico, marcar como erro
    if (mvError || manutError) {
      const erros = [
        mvError ? `Refresh: ${mvError.message}` : '',
        manutError ? `Manutenção: ${manutError.message}` : '',
      ].filter(Boolean).join('; ');
      details.error = erros;

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
      supabase.from(T.empreendimentos).select('id', { count: 'exact', head: true }),
      supabase.from(T.lotes).select('id', { count: 'exact', head: true }),
      supabase.from(T.contratos).select('id', { count: 'exact', head: true }).eq('ativo', true),
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
