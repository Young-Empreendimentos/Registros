-- Corrigir nomes dos empreendimentos (Lorena ll -> Lorena II)

UPDATE empreendimentos SET nome = 'Parque Lorena II' WHERE nome = 'Parque Lorena ll';
UPDATE empreendimentos SET nome = 'Parque Lorena I' WHERE nome = 'Parque Lorena l';
