-- Schema do Controle de Registros no banco espelho Sienge (vvtympzatclvjaqucebr)
-- Tabelas sienge_* já existem; estas são o app com prefixo registros_

CREATE TYPE registros_user_role AS ENUM ('gestor', 'operador', 'leitor');

CREATE TABLE IF NOT EXISTS registros_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role registros_user_role NOT NULL DEFAULT 'leitor',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registros_empreendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_id INT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registros_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_unit_id INT UNIQUE NOT NULL,
  numero TEXT NOT NULL,
  empreendimento_id UUID NOT NULL REFERENCES registros_empreendimentos(id) ON DELETE CASCADE,
  valor_avista NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registros_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_contract_id INT UNIQUE NOT NULL,
  lote_id UUID NOT NULL REFERENCES registros_lotes(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL DEFAULT '',
  cliente_email TEXT DEFAULT '',
  valor_total NUMERIC(14,2) DEFAULT 0,
  valor_ja_pago NUMERIC(14,2) DEFAULT 0,
  data_contrato DATE,
  ultima_atualizacao_valor TIMESTAMPTZ DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true,
  numero_contrato TEXT,
  dias_em_atraso INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registros_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID UNIQUE NOT NULL REFERENCES registros_lotes(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES registros_contratos(id) ON DELETE SET NULL,
  data_solicitacao_itbi DATE,
  valor_itbi NUMERIC(14,2),
  boleto_itbi_url TEXT,
  comprovante_itbi_url TEXT,
  op_registro_url TEXT,
  nf_registro_url TEXT,
  matricula_url TEXT,
  impugnado BOOLEAN NOT NULL DEFAULT false,
  segurar_registro BOOLEAN NOT NULL DEFAULT false,
  responsabilidade_cliente BOOLEAN NOT NULL DEFAULT false,
  financiamento_caixa BOOLEAN NOT NULL DEFAULT false,
  data_recolhimento_itbi DATE,
  data_entrega_ri DATE,
  data_recebimento_ri DATE,
  data_gatilho DATE,
  observacoes TEXT,
  etapa_analise TEXT,
  andamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registros_comprovantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID NOT NULL REFERENCES registros_registros(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES registros_lotes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descricao TEXT,
  uploaded_by UUID REFERENCES registros_usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registros_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  registros_atualizados INT DEFAULT 0,
  detalhes JSONB
);

CREATE INDEX IF NOT EXISTS idx_registros_usuarios_email ON registros_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_registros_usuarios_ativo ON registros_usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_registros_lotes_empreendimento ON registros_lotes(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_registros_contratos_lote ON registros_contratos(lote_id);
CREATE INDEX IF NOT EXISTS idx_registros_contratos_ativo ON registros_contratos(ativo);
CREATE INDEX IF NOT EXISTS idx_registros_contratos_numero ON registros_contratos(numero_contrato);
CREATE INDEX IF NOT EXISTS idx_registros_contratos_dias_atraso ON registros_contratos(dias_em_atraso);
CREATE INDEX IF NOT EXISTS idx_registros_registros_lote ON registros_registros(lote_id);
CREATE INDEX IF NOT EXISTS idx_registros_registros_contrato ON registros_registros(contrato_id);
CREATE INDEX IF NOT EXISTS idx_registros_comprovantes_registro ON registros_comprovantes(registro_id);
CREATE INDEX IF NOT EXISTS idx_registros_comprovantes_lote ON registros_comprovantes(lote_id);

CREATE OR REPLACE FUNCTION registros_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS registros_registros_updated_at ON registros_registros;
CREATE TRIGGER registros_registros_updated_at
  BEFORE UPDATE ON registros_registros
  FOR EACH ROW
  EXECUTE FUNCTION registros_update_updated_at_column();

DROP TRIGGER IF EXISTS registros_usuarios_updated_at ON registros_usuarios;
CREATE TRIGGER registros_usuarios_updated_at
  BEFORE UPDATE ON registros_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION registros_update_updated_at_column();

CREATE OR REPLACE FUNCTION registros_link_comprovante_to_registro()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE registros_registros
  SET comprovante_itbi_url = NEW.url,
      updated_at = now()
  WHERE lote_id = NEW.lote_id
    AND comprovante_itbi_url IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS registros_on_comprovante_created ON registros_comprovantes;
CREATE TRIGGER registros_on_comprovante_created
  AFTER INSERT ON registros_comprovantes
  FOR EACH ROW
  EXECUTE FUNCTION registros_link_comprovante_to_registro();

CREATE OR REPLACE FUNCTION registros_get_lotes_without_registros()
RETURNS SETOF registros_lotes AS $$
  SELECT l.* FROM registros_lotes l
  LEFT JOIN registros_registros r ON r.lote_id = l.id
  WHERE r.id IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;
