-- Etapa e andamento exclusivos da aba Análise (não alteram a etapa calculada nas demais abas)

ALTER TABLE registros ADD COLUMN IF NOT EXISTS etapa_analise TEXT;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS andamento TEXT;

-- Migrar observações já usadas na planilha de análise para o campo dedicado
UPDATE registros
SET andamento = observacoes
WHERE observacoes IS NOT NULL
  AND (andamento IS NULL OR andamento = '');
