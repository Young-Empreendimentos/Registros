-- Adiciona coluna numero_contrato na tabela contratos
-- Esta coluna armazena o número do contrato no SIENGE (ex: "221B")
-- que é diferente do número do lote (ex: "221")
-- Necessário para buscar corretamente os recebimentos na API bulk-data/income

ALTER TABLE contratos ADD COLUMN IF NOT EXISTS numero_contrato TEXT;

-- Criar índice para buscas
CREATE INDEX IF NOT EXISTS idx_contratos_numero_contrato ON contratos(numero_contrato);
