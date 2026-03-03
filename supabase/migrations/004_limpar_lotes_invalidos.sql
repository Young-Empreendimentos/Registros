-- Limpar lotes inválidos (como "The Ecko 38") e corrigir números de lotes

-- 1. Remover registros de lotes inválidos (que contêm texto além de "Lote" + número)
DELETE FROM registros WHERE lote_id IN (
  SELECT id FROM lotes 
  WHERE numero ~ '[A-Za-z]' 
  AND numero !~* '^lote\s*\d+$'
  AND numero !~ '^\d+$'
);

-- 2. Remover contratos de lotes inválidos
DELETE FROM contratos WHERE lote_id IN (
  SELECT id FROM lotes 
  WHERE numero ~ '[A-Za-z]' 
  AND numero !~* '^lote\s*\d+$'
  AND numero !~ '^\d+$'
);

-- 3. Remover lotes inválidos
DELETE FROM lotes 
WHERE numero ~ '[A-Za-z]' 
AND numero !~* '^lote\s*\d+$'
AND numero !~ '^\d+$';

-- 4. Corrigir lotes que têm prefixo "Lote" - extrair apenas o número
UPDATE lotes 
SET numero = regexp_replace(numero, '^[Ll]ote\s*', '')
WHERE numero ~* '^lote\s*\d+$';
