/**
 * Conteúdo da página Ajuda — atualizar ao alterar sync, schema, campos ou fluxos.
 */
export const ULTIMA_ATUALIZACAO_AJUDA = '2026-05-22';
export const VERSAO_AJUDA = '1.2.0';

export const GITHUB_REPO_URL = 'https://github.com/YoungEmpreendimentos/Registros';

/** Banco único: espelho Sienge (sienge_* + registros_*) */
export const BANCO_SUPABASE_ESPELHO = 'Supabase — espelho Sienge (vvtympzatclvjaqucebr)';
export const BANCO_SUPABASE_REGISTROS = BANCO_SUPABASE_ESPELHO;

export const EMPREENDIMENTOS_PERMITIDOS = [
  { id: 1, nome: 'Parque da Guarda Residence' },
  { id: 2, nome: 'Jardim do Parque' },
  { id: 2003, nome: 'Montecarlo' },
  { id: 2004, nome: 'Ilha dos Açores' },
  { id: 2005, nome: 'Aurora' },
  { id: 2007, nome: 'Parque Lorena l' },
  { id: 2009, nome: 'Parque Lorena II' },
  { id: 2010, nome: 'Erico Verissimo' },
  { id: 2011, nome: 'Algarve' },
  { id: 2014, nome: 'Morada da Coxilha' },
];

export const PAPEIS_USUARIO = [
  {
    papel: 'Gestor',
    descricao: 'Acesso total: configurações, usuários, sincronização Sienge e edição de todos os campos.',
  },
  {
    papel: 'Operador',
    descricao: 'Pode editar registros, enviar e-mails e atualizar documentos; não acessa configurações administrativas.',
  },
  {
    papel: 'Leitor',
    descricao: 'Somente visualização; não altera dados.',
  },
];

export const ETAPAS_REGISTRO = [
  'Propriedade Young',
  'Vendido',
  'Gatilho atingido',
  'Solicitar ITBI',
  'Aguardando emissão guia ITBI',
  'Pagar ITBI',
  'ITBI pago/coletar assinaturas',
  'Aguardando conclusão de registro',
  'Aguardando conclusão de registro +30 dias',
  'Concluído',
  'Com pendências',
];

export const GLOSSARIO_CAMPOS = [
  { campo: 'Lote / A.V', descricao: 'Número do lote no empreendimento (valor à vista vem do Sienge).' },
  { campo: 'Cliente', descricao: 'Nome do comprador principal do contrato ativo.' },
  { campo: 'Valor total', descricao: 'Valor total de venda do contrato (Sienge).' },
  { campo: 'Valor já pago', descricao: `Soma dos recebimentos (receipts type=Recebimento) no ${BANCO_SUPABASE_ESPELHO}; não usa juros/multa.` },
  { campo: 'Gatilho', descricao: '15% do valor total (contratos antes de 01/10/2024) ou 30% (a partir dessa data).' },
  { campo: 'Dito', descricao: '(Valor total − 2000) / 1,02 — base para cálculo esperado do ITBI.' },
  { campo: 'Valor esperado ITBI', descricao: '2% do dito (3% em Montecarlo).' },
  { campo: 'Valor ITBI', descricao: 'Valor informado manualmente na guia/parcela.' },
  { campo: 'Divergências', descricao: 'Diferença entre valor ITBI informado e valor esperado.' },
  { campo: 'Data solicitação ITBI', descricao: 'Quando foi solicitada a guia de ITBI.' },
  { campo: 'Boleto ITBI', descricao: 'URL do boleto; pode enviar por e-mail ao financeiro.' },
  { campo: 'Comprovante ITBI', descricao: 'URL do comprovante de pagamento do ITBI.' },
  { campo: 'OP Registro', descricao: 'Ordem de pagamento do registro; pode enviar por e-mail ao financeiro.' },
  { campo: 'NF Registro', descricao: 'Nota fiscal do registro.' },
  { campo: 'Matrícula', descricao: 'Documento de matrícula; pode enviar ao cliente por e-mail.' },
  { campo: 'Data recolhimento ITBI', descricao: 'Data em que o ITBI foi recolhido.' },
  { campo: 'Data entrega RI', descricao: 'Entrega na registradora/imóveis.' },
  { campo: 'Data recebimento RI', descricao: 'Retorno do registro concluído.' },
  { campo: 'Impugnado', descricao: 'Marca processos com impugnação fiscal.' },
  { campo: 'Segurar registro', descricao: 'Pausa o fluxo de registro até liberação.' },
  { campo: 'Responsabilidade cliente', descricao: 'ITBI/registro por conta do cliente.' },
  { campo: 'Financiamento Caixa', descricao: 'Contrato com financiamento Caixa.' },
  { campo: 'Observações', descricao: 'Notas livres da equipe.' },
  { campo: 'Etapa', descricao: 'Status automático calculado com base em datas, URLs e flags.' },
];

/** O que vem da API Sienge e de cada banco Supabase */
export const ORIGEM_DADOS = {
  usoDiario:
    'Nas telas (Registros, Análise, Em Andamento, etc.) o sistema consulta o mesmo banco do espelho (tabelas registros_*). A API Sienge não é chamada ao abrir abas ou editar campos.',
  siengeApi: {
    titulo: 'API Sienge',
    quando: 'Somente na ingestão (automática às 02:00 ou manual: npm run ingest-sienge).',
    destino: `Grava no ${BANCO_SUPABASE_ESPELHO} (tabelas sienge_*).`,
    itens: [
      {
        dado: 'Contratos de venda',
        detalhe: 'Número, valores, datas, situação, empreendimento, unidades e clientes vinculados no contrato.',
      },
      {
        dado: 'Unidades (lotes)',
        detalhe: 'Nome/número, empreendimento, valor do terreno (terrain_value), estoque comercial.',
      },
      {
        dado: 'Clientes',
        detalhe: 'Nome, e-mail e dados cadastrais (consulta individual por ID na API).',
      },
      {
        dado: 'Vínculos contrato ↔ unidade e contrato ↔ cliente',
        detalhe: 'Extraídos dos contratos e salvos nas tabelas de vínculo do Supabase (espelho).',
      },
    ],
    naoPuxa: [
      'Parcelas/recebimentos (sienge_parcelas_receber) — essa tabela já deve existir no Supabase (espelho); a sync só lê.',
      'Campos de registro (ITBI, matrícula, andamento, etapas manuais) — ficam nas tabelas registros_* do mesmo banco.',
    ],
  },
  supabaseEspelho: {
    titulo: BANCO_SUPABASE_ESPELHO,
    quando:
      'Na sync (automática, manual ou botão em Configurações). A ingestão também escreve aqui antes da sync.',
    itens: [
      {
        dado: 'sienge_contratos_de_vendas',
        uso: 'Empreendimentos, contratos ativos, datas e valores de venda.',
      },
      {
        dado: 'sienge_unidades',
        uso: 'Lotes (número), valor à vista por unidade.',
      },
      {
        dado: 'sienge_contrato_unidades',
        uso: 'Qual unidade pertence a cada contrato.',
      },
      {
        dado: 'sienge_contrato_clientes + sienge_clientes',
        uso: 'Nome e e-mail do comprador no contrato.',
      },
      {
        dado: 'sienge_parcelas_receber',
        uso: 'Cálculo do valor já pago (receipts com type = Recebimento).',
      },
    ],
  },
  supabaseRegistros: {
    titulo: BANCO_SUPABASE_REGISTROS,
    quando: 'Leitura em todas as telas; gravação na sync e pelos usuários.',
    atualizadoPelaSync: [
      'Empreendimentos (nome, sienge_id)',
      'Lotes (número, valor à vista, vínculo ao empreendimento)',
      'Contratos (cliente, valor total, valor já pago, datas, ativo, número do contrato)',
      'Registros (criação para lotes novos, vínculo ao contrato, data do gatilho quando atingido)',
    ],
    somenteEquipe: [
      'Datas e URLs de ITBI/registro (solicitação, boleto, comprovante, OP, NF, matrícula)',
      'Flags: impugnado, segurar registro, responsabilidade cliente, financiamento Caixa',
      'Observações, andamento e etapa da aba Análise (etapa_analise)',
      'Comprovantes anexados',
      'Usuários, papéis e logs de sync',
    ],
    calculadoNoApp: [
      'Etapa automática (regras sobre datas, URLs e flags)',
      'Gatilho, dito, valor esperado ITBI, divergências, dias em atraso',
    ],
  },
};

export const SYNC_INFO = {
  frequencia: 'Diária — 1 vez por dia',
  horario: '02:00',
  fuso: 'America/Sao_Paulo',
  servidor:
    'A sincronização automática só roda se o app estiver no ar com npm run start (node server.js), que agenda o cron interno.',
  endpointPipeline: 'POST /api/pipeline-diario',
  endpointSync: 'POST /api/sync',
  endpointIngest: 'POST /api/ingest-sienge',
  sincronizacoes: [
    {
      nome: 'Pipeline diário (automático)',
      quando: 'Todos os dias às 02:00 (America/Sao_Paulo)',
      frequencia: '1x por dia',
      etapas: 'Ingestão + Sync (em sequência)',
      oQueFaz: `Primeiro grava sienge_* no ${BANCO_SUPABASE_ESPELHO}; depois atualiza registros_* no mesmo banco.`,
      disparo: 'Cron em server.js → POST /api/pipeline-diario',
    },
    {
      nome: 'Ingestão Sienge',
      quando: 'Dentro do pipeline automático, ou manual (comando/API)',
      frequencia: 'Conforme disparo',
      etapas: 'Somente ingestão',
      oQueFaz: `Busca na API Sienge e grava/atualiza no ${BANCO_SUPABASE_ESPELHO}: contratos de venda, vínculos contrato-unidade, vínculos contrato-cliente, unidades e clientes.`,
      disparo: 'npm run ingest-sienge ou POST /api/ingest-sienge',
      tabelasTi: [
        'sienge_contratos_de_vendas',
        'sienge_contrato_unidades',
        'sienge_contrato_clientes',
        'sienge_unidades',
        'sienge_clientes',
      ],
    },
    {
      nome: 'Sync para o sistema',
      quando: 'Dentro do pipeline automático, manual em Configurações, ou comando/API',
      frequencia: 'Conforme disparo',
      etapas: 'Somente sync',
      oQueFaz: `Lê sienge_* e atualiza registros_empreendimentos, registros_lotes, registros_contratos, registros_registros (gatilho, valor já pago, etc.).`,
      disparo: 'npm run sync, POST /api/sync, ou botão em Configurações',
      tabelasPrincipal: [
        'registros_empreendimentos',
        'registros_lotes',
        'registros_contratos',
        'registros_registros',
      ],
    },
    {
      nome: 'Sync manual (Configurações)',
      quando: 'Quando o gestor clica em “Sincronizar com SIENGE”',
      frequencia: 'Sob demanda',
      etapas: 'Somente sync (não chama a API Sienge)',
      oQueFaz: `Mesma etapa de sync do pipeline: sienge_* → registros_*. Use após a ingestão do dia, ou para atualizar valores sem esperar o horário automático.`,
      disparo: 'Configurações → Sincronizar com SIENGE (gestor)',
    },
  ],
  comandos: [
    { cmd: 'npm run ingest-sienge', desc: `Somente ingestão: API Sienge → ${BANCO_SUPABASE_ESPELHO}` },
    { cmd: 'npm run sync', desc: 'Somente sync: sienge_* → registros_*' },
    { cmd: 'npm run pipeline-diario', desc: 'Ingestão + sync (igual ao cron das 02:00)' },
    { cmd: 'npm run start', desc: 'Sobe o servidor com cron automático às 02:00' },
  ],
  pipelineEtapas: [
    {
      nome: 'Ingestão',
      descricao: `Busca contratos, unidades e clientes na API Sienge e grava nas tabelas sienge_* do ${BANCO_SUPABASE_ESPELHO}.`,
    },
    {
      nome: 'Sync',
      descricao: 'Lê sienge_* e atualiza registros_* (empreendimentos, lotes, contratos, valores pagos, registros).',
    },
  ],
  notaRecebimentos: `Parcelas/recebimentos (sienge_parcelas_receber no ${BANCO_SUPABASE_ESPELHO}) alimentam o valor já pago na sync; soma apenas receipts com type = Recebimento.`,
};

export const BANCOS_INFO = {
  unico: {
    nome: BANCO_SUPABASE_ESPELHO,
    env: 'SUPABASE_TI_URL + SUPABASE_TI_SERVICE_KEY (+ SUPABASE_TI_ANON_KEY no browser)',
    tabelasSienge: [
      'sienge_contratos_de_vendas',
      'sienge_contrato_unidades',
      'sienge_contrato_clientes',
      'sienge_clientes',
      'sienge_unidades',
      'sienge_parcelas_receber',
    ],
    tabelasRegistros: [
      'registros_empreendimentos',
      'registros_lotes',
      'registros_contratos',
      'registros_registros',
      'registros_comprovantes',
      'registros_usuarios',
      'registros_sync_logs',
    ],
  },
};

export const MANUTENCAO_ITENS = [
  `Rodar npm run pipeline-diario após mudanças na API Sienge ou no ${BANCO_SUPABASE_ESPELHO}.`,
  'Aplicar migrations em supabase-ti/migrations/ no espelho (vvtympzatclvjaqucebr) quando houver novas colunas em registros_*.',
  'Sync manual: Configurações → Sincronizar com SIENGE (gestor).',
  'Consultar histórico em registros_sync_logs ou GET /api/sync-logs.',
  'Variáveis sensíveis ficam em .env.local (nunca commitar).',
];
