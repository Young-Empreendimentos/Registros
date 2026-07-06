-- Adiciona coluna dias_em_atraso na tabela contratos
-- Esta coluna armazena quantos dias o cliente está em atraso no pagamento

ALTER TABLE contratos ADD COLUMN IF NOT EXISTS dias_em_atraso INTEGER DEFAULT 0;

-- Criar índice para ordenação/filtros
CREATE INDEX IF NOT EXISTS idx_contratos_dias_em_atraso ON contratos(dias_em_atraso);
