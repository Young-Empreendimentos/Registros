-- Remove empreendimentos que não estão na lista de IDs permitidos
-- Empreendimentos permitidos (sienge_id -> nome):
-- 1    - Parque da Guarda Residence
-- 2    - Jardim do Parque
-- 2003 - Montecarlo
-- 2004 - Ilha dos Açores
-- 2005 - Aurora
-- 2007 - Parque Lorena I
-- 2009 - Parque Lorena II
-- 2010 - Erico Verissimo
-- 2011 - Algarve
-- 2014 - Morada da Coxilha
-- 2019 - Parque Lorena Itaqui

-- 1. Deletar comprovantes de registros vinculados a lotes de empreendimentos removidos
DELETE FROM comprovantes
WHERE registro_id IN (
  SELECT r.id FROM registros r
  JOIN lotes l ON r.lote_id = l.id
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.sienge_id NOT IN (1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014, 2019)
);

-- 2. Deletar registros vinculados a lotes de empreendimentos removidos
DELETE FROM registros
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.sienge_id NOT IN (1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014, 2019)
);

-- 3. Deletar contratos vinculados a lotes de empreendimentos removidos
DELETE FROM contratos
WHERE lote_id IN (
  SELECT l.id FROM lotes l
  JOIN empreendimentos e ON l.empreendimento_id = e.id
  WHERE e.sienge_id NOT IN (1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014, 2019)
);

-- 4. Deletar lotes de empreendimentos removidos
DELETE FROM lotes
WHERE empreendimento_id IN (
  SELECT id FROM empreendimentos
  WHERE sienge_id NOT IN (1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014, 2019)
);

-- 5. Deletar os empreendimentos
DELETE FROM empreendimentos
WHERE sienge_id NOT IN (1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014, 2019);
