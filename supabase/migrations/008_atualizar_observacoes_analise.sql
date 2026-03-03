-- Atualizar observações dos registros conforme planilha de análise

-- Montecarlo lote 2
UPDATE registros SET observacoes = 'Escritura assinada. Aguardando registro da mesma. - 12/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Montecarlo' AND (l.numero = '2' OR l.numero = '02')
);

-- Ilha dos Açores lote 320
UPDATE registros SET observacoes = 'Aguardar até segunda ordem - 21/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores' AND l.numero = '320'
);

-- Ilha dos Açores lote 58
UPDATE registros SET observacoes = 'Reconhecer assinaturas e protocolar R.I - 19/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores' AND (l.numero = '58' OR l.numero = '058')
);

-- Algarve lote 13
UPDATE registros SET observacoes = 'Em registro - 23/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Algarve%' AND (l.numero = '13' OR l.numero = '013')
);

-- Erico Verissimo lote 234
UPDATE registros SET observacoes = 'Enviado via correios para Cruz Alta e Flávia Zarth reconhecer assinaturas - 19/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Erico Verissimo%' AND l.numero = '234'
);

-- Ilha dos Açores lote 176
UPDATE registros SET observacoes = 'Em registro - 07/01'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores' AND l.numero = '176'
);

-- Montecarlo lote 183
UPDATE registros SET observacoes = 'Em registro - 07/01'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Montecarlo' AND l.numero = '183'
);

-- Erico Verissimo lote 186
UPDATE registros SET observacoes = 'Enviado via correios para Cruz Alta e Flávia Zarth reconhecer assinaturas - 19/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Erico Verissimo%' AND l.numero = '186'
);

-- Erico Verissimo lote 187
UPDATE registros SET observacoes = 'Enviado via correios para Cruz Alta e Flávia Zarth reconhecer assinaturas - 19/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Erico Verissimo%' AND l.numero = '187'
);

-- Aurora lote 214
UPDATE registros SET observacoes = 'Enviado via correios ao R.I de Livramento - 23/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Aurora' AND l.numero = '214'
);

-- Aurora lote 153
UPDATE registros SET observacoes = 'Enviado via correios ao R.I de Livramento - 23/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Aurora' AND l.numero = '153'
);

-- Aurora lote 5
UPDATE registros SET observacoes = 'Aguardando coleta da assinatura do cliente - 23/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Aurora' AND (l.numero = '5' OR l.numero = '05')
);

-- Erico Verissimo lote 70
UPDATE registros SET observacoes = 'Enviado via correios para Cruz Alta e Flávia Zarth reconhecer assinaturas - 19/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Erico Verissimo%' AND (l.numero = '70' OR l.numero = '070')
);

-- Ilha dos Açores lote 264
UPDATE registros SET observacoes = 'Ajustando impugnação - 21/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores' AND l.numero = '264'
);

-- Ilha dos Açores lote 32
UPDATE registros SET observacoes = 'Ajustando impugnação - 21/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores' AND (l.numero = '32' OR l.numero = '032')
);

-- Aurora lote 22
UPDATE registros SET observacoes = 'Enviado via correios ao R.I de Livramento - 23/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Aurora' AND (l.numero = '22' OR l.numero = '022')
);

-- Erico Verissimo lote 68
UPDATE registros SET observacoes = 'Enviado via correios para Cruz Alta e Flávia Zarth reconhecer assinaturas - 19/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Erico Verissimo%' AND (l.numero = '68' OR l.numero = '068')
);

-- Erico Verissimo lote 228
UPDATE registros SET observacoes = 'Enviado via correios para Cruz Alta e Flávia Zarth reconhecer assinaturas - 19/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Erico Verissimo%' AND l.numero = '228'
);

-- Erico Verissimo lote 263
UPDATE registros SET observacoes = 'Enviado via correios para Cruz Alta e Flávia Zarth reconhecer assinaturas - 19/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Erico Verissimo%' AND l.numero = '263'
);

-- Erico Verissimo lote 266
UPDATE registros SET observacoes = 'Aguardando Eduardo assinar - 20/02'
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Erico Verissimo%' AND l.numero = '266'
);
