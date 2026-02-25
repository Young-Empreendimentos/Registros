export type UserRole = 'admin' | 'direcao' | 'operador' | 'leitura';

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  created_at: string;
}

export interface Empreendimento {
  id: string;
  sienge_id: number;
  nome: string;
  created_at: string;
}

export interface Lote {
  id: string;
  sienge_unit_id: number;
  numero: string;
  empreendimento_id: string;
  valor_avista: number;
  created_at: string;
}

export interface Contrato {
  id: string;
  sienge_contract_id: number;
  lote_id: string;
  cliente_nome: string;
  cliente_email: string;
  valor_total: number;
  valor_ja_pago: number;
  data_contrato: string;
  ultima_atualizacao_valor: string;
  ativo: boolean;
  created_at: string;
}

export interface Registro {
  id: string;
  lote_id: string;
  contrato_id: string | null;
  data_solicitacao_itbi: string | null;
  valor_itbi: number | null;
  boleto_itbi_url: string | null;
  comprovante_itbi_url: string | null;
  op_registro_url: string | null;
  nf_registro_url: string | null;
  matricula_url: string | null;
  impugnado: boolean;
  data_recolhimento_itbi: string | null;
  data_entrega_ri: string | null;
  data_recebimento_ri: string | null;
  segurar_registro: boolean;
  responsabilidade_cliente: boolean;
  financiamento_caixa: boolean;
  observacoes: string | null;
  data_gatilho: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comprovante {
  id: string;
  registro_id: string;
  lote_id: string;
  url: string;
  descricao: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface SyncLog {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  registros_atualizados: number;
  detalhes: Record<string, unknown> | null;
}

export type Etapa =
  | 'Com pendências'
  | 'Concluído'
  | 'Aguardando conclusão de registro +30 dias'
  | 'Aguardando conclusão de registro'
  | 'Solicitar ITBI'
  | 'Aguardando emissão guia ITBI'
  | 'Pagar ITBI'
  | 'ITBI pago/coletar assinaturas'
  | 'Gatilho atingido'
  | 'Vendido'
  | 'Propriedade Young';

export interface RegistroCompleto {
  registro: Registro;
  lote: Lote;
  empreendimento: Empreendimento;
  contrato: Contrato | null;
  etapa: Etapa;
  gatilho: number;
  gatilho_atingido: boolean;
  dito: number;
  valor_esperado_itbi: number;
  divergencias: number | null;
  dias: number | null;
}
