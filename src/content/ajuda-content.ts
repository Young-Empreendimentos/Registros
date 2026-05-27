/**
 * Conteúdo da página Ajuda — atualizar ao alterar sync, schema, campos ou fluxos.
 */
export const ULTIMA_ATUALIZACAO_AJUDA = '2026-05-22';
export const VERSAO_AJUDA = '1.3.0';

export const GITHUB_REPO_URL = 'https://github.com/YoungEmpreendimentos/Registros';

/** Projeto Supabase único (espelho Sienge + app) */
export const SUPABASE_PROJETO_ID = 'vvtympzatclvjaqucebr';
export const SUPABASE_PROJETO_URL = `https://${SUPABASE_PROJETO_ID}.supabase.co`;
export const BANCO_SUPABASE_ESPELHO = `Supabase — espelho Sienge (${SUPABASE_PROJETO_ID})`;
export const BANCO_SUPABASE_REGISTROS = BANCO_SUPABASE_ESPELHO;

/** Projeto legado descontinuado (dados migrados para o espelho) */
export const SUPABASE_LEGADO_ID = 'atfsixsamqwndwnfvpdy';

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

/** Etapas usadas na aba Análise (etapa automática ou etapa_analise manual) */
export const ETAPAS_ANALISE_AJUDA = [
  'Com pendências',
  'Aguardando conclusão de registro +30 dias',
  'Aguardando conclusão de registro',
  'Solicitar ITBI',
  'Aguardando emissão guia ITBI',
  'Pagar ITBI',
  'ITBI pago/coletar assinaturas',
  'Gatilho atingido',
];

export const ABAS_SISTEMA = [
  {
    aba: 'Registros',
    descricao: 'Visão geral de todos os lotes com etapa automática calculada no app.',
  },
  {
    aba: 'Análise',
    descricao:
      'Lista filtrada “em andamento”: etapas da análise, etapa editável (etapa_analise), andamento em texto livre. Não inclui Morada da Coxilha, financiamento Caixa nem “segurar registro”.',
  },
  {
    aba: 'Em Andamento',
    descricao: 'Mesmo critério de contagem da Análise; foco operacional no fluxo ativo.',
  },
  {
    aba: 'Ativos',
    descricao: 'Contratos/lotes ativos conforme sync Sienge.',
  },
  {
    aba: 'Comprovantes',
    descricao: 'Anexos de ITBI vinculados a lotes (registros_comprovantes).',
  },
  {
    aba: 'Configurações',
    descricao: 'Sync manual, usuários (gestor) e parâmetros do sistema.',
  },
];

export const GLOSSARIO_CAMPOS = [
  { campo: 'Lote / A.V', descricao: 'Número do lote no empreendimento (valor à vista vem do Sienge).' },
  { campo: 'Cliente', descricao: 'Nome do comprador principal do contrato ativo.' },
  { campo: 'Valor total', descricao: 'Valor total de venda do contrato (Sienge).' },
  {
    campo: 'Valor já pago',
    descricao:
      'Soma dos recebimentos (receipts type=Recebimento) em sienge_parcelas_receber; não usa juros/multa.',
  },
  { campo: 'Gatilho', descricao: '15% do valor total (contratos antes de 01/10/2024) ou 30% (a partir dessa data).' },
  { campo: 'Dito', descricao: '(Valor total − 2000) / 1,02 — base para cálculo esperado do ITBI.' },
  { campo: 'Valor esperado ITBI', descricao: '2% do dito (3% em Montecarlo).' },
  { campo: 'Valor ITBI', descricao: 'Valor informado manualmente na guia/parcela.' },
  { campo: 'Divergências', descricao: 'Diferença entre valor ITBI informado e valor esperado.' },
  { campo: 'Data solicitação ITBI', descricao: 'Quando foi solicitada a guia de ITBI.' },
  {
    campo: 'Boleto ITBI',
    descricao: 'URL do boleto; envio por e-mail vai para o financeiro (não para o cliente).',
  },
  { campo: 'Comprovante ITBI', descricao: 'URL do comprovante de pagamento do ITBI.' },
  {
    campo: 'OP Registro',
    descricao: 'Ordem de pagamento do registro; envio por e-mail vai para o financeiro.',
  },
  { campo: 'NF Registro', descricao: 'Nota fiscal do registro.' },
  { campo: 'Matrícula', descricao: 'Documento de matrícula; pode enviar ao cliente por e-mail.' },
  { campo: 'Data recolhimento ITBI', descricao: 'Data em que o ITBI foi recolhido.' },
  { campo: 'Data entrega RI', descricao: 'Entrega na registradora/imóveis.' },
  { campo: 'Data recebimento RI', descricao: 'Retorno do registro concluído (etapa Concluído).' },
  { campo: 'Impugnado', descricao: 'Marca processos com impugnação fiscal.' },
  { campo: 'Segurar registro', descricao: 'Pausa o fluxo; exclui das abas Análise / Em Andamento.' },
  { campo: 'Responsabilidade cliente', descricao: 'ITBI/registro por conta do cliente.' },
  {
    campo: 'Financiamento Caixa',
    descricao: 'Contrato com financiamento Caixa; exclui das abas Análise / Em Andamento.',
  },
  { campo: 'Observações', descricao: 'Notas livres da equipe (demais abas).' },
  {
    campo: 'Etapa (automática)',
    descricao: 'Calculada no app com datas, URLs e flags — usada em Registros e demais abas.',
  },
  {
    campo: 'Etapa Análise (etapa_analise)',
    descricao:
      'Opcional na aba Análise; se preenchida, substitui a etapa automática só nessa aba e no contador “em andamento”.',
  },
  {
    campo: 'Andamento',
    descricao:
      'Texto livre da aba Análise (coluna andamento em registros_registros); independente de observações.',
  },
];

/** O que vem da API Sienge e do Supabase */
export const ORIGEM_DADOS = {
  usoDiario:
    'Todas as telas leem e gravam no mesmo projeto Supabase (vvtympzatclvjaqucebr): tabelas registros_* para o app e sienge_* para o espelho da API. A API Sienge não é chamada ao navegar ou editar campos.',
  siengeApi: {
    titulo: 'API Sienge',
    quando: 'Somente na ingestão (automática às 02:00 ou manual: npm run ingest-sienge).',
    destino: `Grava em sienge_* no projeto ${SUPABASE_PROJETO_ID}.`,
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
        detalhe: 'Extraídos dos contratos e salvos em sienge_contrato_unidades e sienge_contrato_clientes.',
      },
    ],
    naoPuxa: [
      'Parcelas/recebimentos (sienge_parcelas_receber) — mantida no Supabase pelo TI/planilhas; a sync só lê.',
      'Campos de registro (ITBI, matrícula, andamento, etapa_analise) — ficam em registros_* no mesmo banco.',
    ],
  },
  supabaseEspelho: {
    titulo: 'Tabelas sienge_* (espelho)',
    quando: 'Ingestão grava; sync lê para atualizar registros_*.',
    itens: [
      { dado: 'sienge_contratos_de_vendas', uso: 'Empreendimentos, contratos ativos, datas e valores de venda.' },
      { dado: 'sienge_unidades', uso: 'Lotes (número), valor à vista por unidade.' },
      { dado: 'sienge_contrato_unidades', uso: 'Qual unidade pertence a cada contrato.' },
      { dado: 'sienge_contrato_clientes + sienge_clientes', uso: 'Nome e e-mail do comprador no contrato.' },
      { dado: 'sienge_parcelas_receber', uso: 'Cálculo do valor já pago (receipts com type = Recebimento).' },
    ],
  },
  supabaseRegistros: {
    titulo: 'Tabelas registros_* (app)',
    quando: 'Leitura em todas as telas; gravação na sync e pelos usuários (login em registros_usuarios).',
    atualizadoPelaSync: [
      'registros_empreendimentos (nome, sienge_id)',
      'registros_lotes (número, valor à vista, vínculo ao empreendimento)',
      'registros_contratos (cliente, valor total, valor já pago, datas, ativo, numero_contrato, dias_em_atraso)',
      'registros_registros (criação para lotes novos, vínculo ao contrato, data_gatilho quando atingido)',
    ],
    somenteEquipe: [
      'Datas e URLs de ITBI/registro (solicitação, boleto, comprovante, OP, NF, matrícula)',
      'Flags: impugnado, segurar_registro, responsabilidade_cliente, financiamento_caixa',
      'observacoes, andamento e etapa_analise (aba Análise)',
      'registros_comprovantes',
      'registros_usuarios e registros_sync_logs',
    ],
    calculadoNoApp: [
      'Etapa automática (regras sobre datas, URLs e flags)',
      'Gatilho, dito, valor esperado ITBI, divergências',
      'Contador “em andamento” (regras da aba Análise)',
    ],
  },
};

export const MAPA_TABELAS_LEGADO = [
  { antiga: 'usuarios', nova: 'registros_usuarios' },
  { antiga: 'empreendimentos', nova: 'registros_empreendimentos' },
  { antiga: 'lotes', nova: 'registros_lotes' },
  { antiga: 'contratos', nova: 'registros_contratos' },
  { antiga: 'registros', nova: 'registros_registros' },
  { antiga: 'comprovantes', nova: 'registros_comprovantes' },
  { antiga: 'sync_logs', nova: 'registros_sync_logs' },
];

export const MIGRACAO_INFO = {
  resumo: `O projeto ${SUPABASE_LEGADO_ID} foi descontinuado. Todos os dados do app passaram para ${SUPABASE_PROJETO_ID} com prefixo registros_*.`,
  schemaSql: 'supabase-ti/migrations/002_registros_schema.sql',
  comandoMigracao: 'npm run migrar-dados-para-espelho',
  preRequisitos: [
    `Executar 002_registros_schema.sql no SQL Editor do projeto ${SUPABASE_PROJETO_ID}`,
    '.env.local com SUPABASE_TI_* (espelho) e SUPABASE_LEGACY_* (projeto antigo, só para migração)',
  ],
  envProducao: [
    'SUPABASE_TI_URL / SUPABASE_TI_SERVICE_KEY / SUPABASE_TI_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (mesmo projeto)',
    'SMTP: comercial@youngempreendimentos.com.br',
  ],
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
      oQueFaz: 'API Sienge → sienge_* → registros_* (mesmo banco).',
      disparo: 'Cron em server.js → POST /api/pipeline-diario',
    },
    {
      nome: 'Ingestão Sienge',
      quando: 'Dentro do pipeline automático, ou manual (comando/API)',
      frequencia: 'Conforme disparo',
      etapas: 'Somente ingestão',
      oQueFaz:
        'Busca na API Sienge e grava/atualiza sienge_contratos_de_vendas, sienge_contrato_unidades, sienge_contrato_clientes, sienge_unidades e sienge_clientes.',
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
      nome: 'Sync para registros_*',
      quando: 'Dentro do pipeline automático, manual em Configurações, ou comando/API',
      frequencia: 'Conforme disparo',
      etapas: 'Somente sync',
      oQueFaz:
        'Lê sienge_* e atualiza registros_empreendimentos, registros_lotes, registros_contratos e registros_registros (gatilho, valor já pago, etc.).',
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
      oQueFaz: 'Mesma sync do pipeline: sienge_* → registros_*. Use após a ingestão do dia.',
      disparo: 'Configurações → Sincronizar com SIENGE (gestor)',
    },
  ],
  comandos: [
    { cmd: 'npm run ingest-sienge', desc: 'Somente ingestão: API Sienge → sienge_*' },
    { cmd: 'npm run sync', desc: 'Somente sync: sienge_* → registros_*' },
    { cmd: 'npm run pipeline-diario', desc: 'Ingestão + sync (igual ao cron das 02:00)' },
    { cmd: 'npm run start', desc: 'Sobe o servidor com cron automático às 02:00' },
    { cmd: 'npm run migrar-dados-para-espelho', desc: 'Copia dados do projeto legado para registros_* (one-shot)' },
    { cmd: 'npm run marcar-concluidos-planilha', desc: 'Marca concluídos a partir da planilha Google (data_recebimento_ri)' },
  ],
  pipelineEtapas: [
    {
      nome: 'Ingestão',
      descricao: 'API Sienge → tabelas sienge_* no espelho.',
    },
    {
      nome: 'Sync',
      descricao: 'sienge_* → registros_* (empreendimentos, lotes, contratos, registros, valores pagos).',
    },
  ],
  notaRecebimentos:
    'sienge_parcelas_receber alimenta o valor já pago na sync; soma apenas receipts com type = Recebimento (sem juros/multa).',
};

export const BANCOS_INFO = {
  unico: {
    nome: BANCO_SUPABASE_ESPELHO,
    url: SUPABASE_PROJETO_URL,
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
  legado: {
    id: SUPABASE_LEGADO_ID,
    status: 'Descontinuado — dados migrados para registros_*',
  },
};

export const DEPLOY_HETZNER_RESUMO = {
  guia: 'deploy/DEPLOY-HETZNER.md',
  pastaServidor: '/opt/registros',
  comandoAtualizar: 'git pull && docker compose build && docker compose up -d',
  requisitos: ['Docker', 'Nginx + HTTPS (recomendado)', '.env.local no servidor'],
};

export const MANUTENCAO_ITENS = [
  'Rodar npm run pipeline-diario após mudanças na API Sienge ou em sienge_parcelas_receber.',
  `Novas colunas do app: SQL em supabase-ti/migrations/ no projeto ${SUPABASE_PROJETO_ID}.`,
  'Histórico de sync: tabela registros_sync_logs ou GET /api/sync-logs.',
  'Sync manual: Configurações → Sincronizar com SIENGE (gestor).',
  'Credenciais em .env.local (nunca commitar).',
  `Projeto antigo ${SUPABASE_LEGADO_ID} não deve mais ser usado em produção.`,
];
