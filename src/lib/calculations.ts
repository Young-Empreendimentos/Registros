import type { Contrato, Empreendimento, Etapa, Lote, Registro } from '@/types';

export function calcularGatilho(contrato: Contrato | null): number {
  if (!contrato || contrato.valor_total <= 0) return 0;
  const dataContrato = new Date(contrato.data_contrato);
  const dataLimite = new Date('2024-10-01');
  const percentual = dataContrato < dataLimite ? 0.15 : 0.30;
  return contrato.valor_total * percentual;
}

export function isGatilhoAtingido(contrato: Contrato | null, gatilho: number): boolean {
  if (!contrato) return false;
  return contrato.valor_ja_pago >= gatilho && contrato.valor_ja_pago > 0;
}

export function calcularDito(contrato: Contrato | null): number {
  if (!contrato || contrato.valor_total <= 0) return 0;
  return (contrato.valor_total - 2000) / 1.02;
}

export function calcularValorEsperadoITBI(
  dito: number,
  empreendimento: Empreendimento
): number {
  const percentual = empreendimento.nome === 'Montecarlo' ? 0.03 : 0.02;
  return dito * percentual;
}

export function calcularDivergencias(
  valorItbi: number | null,
  valorEsperado: number
): number | null {
  if (valorItbi === null || valorItbi === 0) return null;
  return valorItbi - valorEsperado;
}

export function calcularDias(
  dataGatilho: string | null,
  etapa: Etapa
): number | null {
  if (!dataGatilho) return null;
  if (etapa === 'Concluído' || etapa === 'Propriedade Young') return null;
  const hoje = new Date();
  const dGatilho = new Date(dataGatilho);
  const diff = hoje.getTime() - dGatilho.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function calcularEtapa(
  registro: Registro,
  contrato: Contrato | null,
  gatilhoAtingido: boolean,
  _lote: Lote
): Etapa {
  if (registro.impugnado) {
    return 'Com pendências';
  }

  if (registro.data_recebimento_ri || registro.matricula_url) {
    return 'Concluído';
  }

  if (registro.data_entrega_ri) {
    const dataEntrega = new Date(registro.data_entrega_ri);
    const hoje = new Date();
    const diffDias = Math.floor(
      (hoje.getTime() - dataEntrega.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDias > 30) {
      return 'Aguardando conclusão de registro +30 dias';
    }
    return 'Aguardando conclusão de registro';
  }

  if (gatilhoAtingido && !registro.data_solicitacao_itbi) {
    return 'Solicitar ITBI';
  }

  if (gatilhoAtingido && registro.data_solicitacao_itbi && !registro.valor_itbi) {
    return 'Aguardando emissão guia ITBI';
  }

  if (gatilhoAtingido && registro.valor_itbi && !registro.comprovante_itbi_url) {
    return 'Pagar ITBI';
  }

  if (
    gatilhoAtingido &&
    registro.comprovante_itbi_url &&
    (!registro.data_entrega_ri || !registro.op_registro_url || !registro.nf_registro_url)
  ) {
    return 'ITBI pago/coletar assinaturas';
  }

  if (gatilhoAtingido) {
    return 'Gatilho atingido';
  }

  // Se tem contrato ativo, é vendido (mesmo que valor_ja_pago seja 0)
  if (contrato && contrato.ativo) {
    return 'Vendido';
  }

  return 'Propriedade Young';
}

export function computarRegistroCompleto(
  registro: Registro,
  lote: Lote,
  empreendimento: Empreendimento,
  contrato: Contrato | null
) {
  const gatilho = calcularGatilho(contrato);
  const gatilho_atingido = isGatilhoAtingido(contrato, gatilho);
  const dito = calcularDito(contrato);
  const valor_esperado_itbi = calcularValorEsperadoITBI(dito, empreendimento);
  const etapa = calcularEtapa(registro, contrato, gatilho_atingido, lote);
  const divergencias = calcularDivergencias(registro.valor_itbi, valor_esperado_itbi);
  const dias = calcularDias(registro.data_gatilho, etapa);

  return {
    registro,
    lote,
    empreendimento,
    contrato,
    etapa,
    gatilho,
    gatilho_atingido,
    dito,
    valor_esperado_itbi,
    divergencias,
    dias,
  };
}
