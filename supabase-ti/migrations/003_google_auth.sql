-- Login com Google + fluxo de aprovação no Controle de Registros
-- Banco espelho Sienge (vvtympzatclvjaqucebr), tabela registros_usuarios

-- 1. Aprovação: usuários atuais já ficam aprovados (default true).
--    Solicitações criadas via Google entram com aprovado = false.
ALTER TABLE registros_usuarios
  ADD COLUMN IF NOT EXISTS aprovado BOOLEAN NOT NULL DEFAULT true;

-- 2. Usuário que entra só pelo Google não tem senha local.
ALTER TABLE registros_usuarios
  ALTER COLUMN senha_hash DROP NOT NULL;

-- 3. Origem do cadastro: 'senha' (padrão) ou 'google'.
ALTER TABLE registros_usuarios
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'senha';

-- Índice para listar solicitações pendentes rapidamente.
CREATE INDEX IF NOT EXISTS idx_registros_usuarios_aprovado
  ON registros_usuarios(aprovado);
