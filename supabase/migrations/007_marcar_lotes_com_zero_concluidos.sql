-- Marcar lotes com zero à esquerda (01-09) como concluídos em todos os empreendimentos
-- Baseado na lista original de concluídos

-- Parque Lorena I - lotes 1-9
UPDATE registros SET data_recebimento_ri = CURRENT_DATE
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Parque Lorena I'
  AND l.numero IN ('01', '02', '03', '04', '05', '06', '07', '08', '09')
)
AND data_recebimento_ri IS NULL;

-- Parque da Guarda Residence - lotes 1-9
UPDATE registros SET data_recebimento_ri = CURRENT_DATE
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Parque da Guarda Residence'
  AND l.numero IN ('01', '02', '03', '04', '05', '06', '07', '08', '09')
)
AND data_recebimento_ri IS NULL;

-- Jardim do Parque - lotes 1-9
UPDATE registros SET data_recebimento_ri = CURRENT_DATE
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Jardim do Parque'
  AND l.numero IN ('01', '02', '03', '04', '05', '06', '07', '08', '09')
)
AND data_recebimento_ri IS NULL;

-- Montecarlo - lotes 3-9 (conforme lista original)
UPDATE registros SET data_recebimento_ri = CURRENT_DATE
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Montecarlo'
  AND l.numero IN ('03', '04', '05', '07', '08', '09')
)
AND data_recebimento_ri IS NULL;

-- Ilha dos Açores - lotes 6-9
UPDATE registros SET data_recebimento_ri = CURRENT_DATE
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Ilha dos Açores'
  AND l.numero IN ('06', '07', '08', '09')
)
AND data_recebimento_ri IS NULL;

-- Algarve - lotes 2, 3, 5, 6
UPDATE registros SET data_recebimento_ri = CURRENT_DATE
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome LIKE 'Algarve%'
  AND l.numero IN ('02', '03', '05', '06')
)
AND data_recebimento_ri IS NULL;

-- Aurora - lotes 2, 3
UPDATE registros SET data_recebimento_ri = CURRENT_DATE
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.nome = 'Aurora'
  AND l.numero IN ('02', '03')
)
AND data_recebimento_ri IS NULL;
