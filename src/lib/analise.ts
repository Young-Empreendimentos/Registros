import type { Etapa, Registro, RegistroCompleto } from '@/types';

/** Etapas exibidas e editáveis na aba Análise */
export const ETAPAS_ANALISE: Etapa[] = [
  'Com pendências',
  'Aguardando conclusão de registro +30 dias',
  'Aguardando conclusão de registro',
  'Solicitar ITBI',
  'Aguardando emissão guia ITBI',
  'Pagar ITBI',
  'ITBI pago/coletar assinaturas',
  'Gatilho atingido',
];

export function getEtapaAnalise(item: RegistroCompleto): Etapa {
  const manual = item.registro.etapa_analise as Etapa | null | undefined;
  if (manual) return manual;
  return item.etapa;
}

export function getAndamento(registro: Registro): string | null {
  if (registro.andamento != null && registro.andamento !== '') {
    return registro.andamento;
  }
  return registro.observacoes ?? null;
}

/** Empreendimento fora do acompanhamento em andamento / análise */
export const EMPREENDIMENTO_EXCLUIDO_EM_ANDAMENTO = 'Morada da Coxilha';

export function isExcluidoDoEmAndamento(item: RegistroCompleto): boolean {
  return (
    item.registro.segurar_registro ||
    item.registro.financiamento_caixa ||
    item.empreendimento.nome === EMPREENDIMENTO_EXCLUIDO_EM_ANDAMENTO
  );
}

/** Mesmo critério da aba Análise e do contador "em andamento" em todo o sistema */
export function isRegistroEmAndamento(item: RegistroCompleto): boolean {
  if (isExcluidoDoEmAndamento(item)) return false;
  return ETAPAS_ANALISE.includes(getEtapaAnalise(item));
}

/** @alias isRegistroEmAndamento */
export const isRegistroNaAnalise = isRegistroEmAndamento;

export function filtrarRegistrosEmAndamento(
  registros: RegistroCompleto[]
): RegistroCompleto[] {
  return registros.filter(isRegistroEmAndamento);
}

export function contarRegistrosEmAndamento(registros: RegistroCompleto[]): number {
  return filtrarRegistrosEmAndamento(registros).length;
}
