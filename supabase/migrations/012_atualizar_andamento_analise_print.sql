-- Andamentos da aba Análise (print Tabela_1) — requer colunas de 011_etapa_analise_andamento.sql

UPDATE registros SET andamento = 'Aguardar até segunda ordem', observacoes = 'Aguardar até segunda ordem'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores' AND l.numero IN ('320', '0320')
);

UPDATE registros SET andamento = 'Reprotocolado', observacoes = 'Reprotocolado'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores' AND l.numero IN ('58', '058')
);

UPDATE registros SET andamento = 'Impugnado. Coletar assinatura do cliente, reconhecer e reprotocolar. Cliente não está retornando mensagens e ligações. Pedi ajuda da Andreice para chamar etc.',
  observacoes = 'Impugnado. Coletar assinatura do cliente, reconhecer e reprotocolar. Cliente não está retornando mensagens e ligações. Pedi ajuda da Andreice para chamar etc.'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Montecarlo' AND l.numero IN ('183')
);

UPDATE registros SET andamento = 'Reprotocolado', observacoes = 'Reprotocolado'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Erico Verissimo' AND l.numero IN ('70', '255', '250', '205')
);

UPDATE registros SET andamento = 'Estou verificando onde este contrato está com a Caroline, pois não chegou ainda',
  observacoes = 'Estou verificando onde este contrato está com a Caroline, pois não chegou ainda'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Aurora' AND l.numero IN ('5', '05')
);

UPDATE registros SET andamento = 'Impugnado. Voltou dos correios de Cruz Alta pois não receberam o pedido. Iremos reenviar',
  observacoes = 'Impugnado. Voltou dos correios de Cruz Alta pois não receberam o pedido. Iremos reenviar'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Erico Verissimo' AND l.numero IN ('69')
);

UPDATE registros SET andamento = 'Reprotocolado', observacoes = 'Reprotocolado'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores' AND l.numero IN ('264', '32', '032')
);

UPDATE registros SET andamento = 'Estamos coletando as assinaturas, reconhecer e protocolar.',
  observacoes = 'Estamos coletando as assinaturas, reconhecer e protocolar.'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Erico Verissimo' AND l.numero IN ('250', '205')
);

UPDATE registros SET andamento = 'Protocolado', observacoes = 'Protocolado'
WHERE lote_id IN (
  SELECT l.id FROM lotes l JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Aurora' AND l.numero IN ('99', '099')
);
