-- Rodar no projeto Supabase TI (vvtympzatclvjaqucebr)
-- Adiciona campos necessários para sync sem chamar API Sienge

ALTER TABLE sienge_unidades
  ADD COLUMN IF NOT EXISTS enterprise_id INT,
  ADD COLUMN IF NOT EXISTS terrain_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commercial_stock TEXT,
  ADD COLUMN IF NOT EXISTS contract_id INT;

CREATE INDEX IF NOT EXISTS idx_sienge_unidades_enterprise_id
  ON sienge_unidades (enterprise_id);
