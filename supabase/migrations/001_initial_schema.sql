-- Enum para roles de usuário
CREATE TYPE user_role AS ENUM ('gestor', 'operador', 'leitor');

-- Tabela de usuários (autenticação própria)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'leitor',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de empreendimentos
CREATE TABLE empreendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_id INT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de lotes
CREATE TABLE lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_unit_id INT UNIQUE NOT NULL,
  numero TEXT NOT NULL,
  empreendimento_id UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  valor_avista NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de contratos
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_contract_id INT UNIQUE NOT NULL,
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL DEFAULT '',
  cliente_email TEXT DEFAULT '',
  valor_total NUMERIC(14,2) DEFAULT 0,
  valor_ja_pago NUMERIC(14,2) DEFAULT 0,
  data_contrato DATE,
  ultima_atualizacao_valor TIMESTAMPTZ DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de registros (dados manuais)
CREATE TABLE registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID UNIQUE NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,

  -- Campos ITBI
  data_solicitacao_itbi DATE,
  valor_itbi NUMERIC(14,2),
  boleto_itbi_url TEXT,
  comprovante_itbi_url TEXT,

  -- Campos Registro
  op_registro_url TEXT,
  nf_registro_url TEXT,
  matricula_url TEXT,

  -- Flags
  impugnado BOOLEAN NOT NULL DEFAULT false,
  segurar_registro BOOLEAN NOT NULL DEFAULT false,
  responsabilidade_cliente BOOLEAN NOT NULL DEFAULT false,
  financiamento_caixa BOOLEAN NOT NULL DEFAULT false,

  -- Datas
  data_recolhimento_itbi DATE,
  data_entrega_ri DATE,
  data_recebimento_ri DATE,
  data_gatilho DATE,

  -- Texto
  observacoes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de comprovantes
CREATE TABLE comprovantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descricao TEXT,
  uploaded_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de logs de sincronização
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  registros_atualizados INT DEFAULT 0,
  detalhes JSONB
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX idx_lotes_empreendimento ON lotes(empreendimento_id);
CREATE INDEX idx_contratos_lote ON contratos(lote_id);
CREATE INDEX idx_contratos_ativo ON contratos(ativo);
CREATE INDEX idx_registros_lote ON registros(lote_id);
CREATE INDEX idx_registros_contrato ON registros(contrato_id);
CREATE INDEX idx_comprovantes_registro ON comprovantes(registro_id);
CREATE INDEX idx_comprovantes_lote ON comprovantes(lote_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registros_updated_at
  BEFORE UPDATE ON registros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para vincular comprovante ao registro automaticamente
CREATE OR REPLACE FUNCTION link_comprovante_to_registro()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE registros
  SET comprovante_itbi_url = NEW.url,
      updated_at = now()
  WHERE lote_id = NEW.lote_id
    AND comprovante_itbi_url IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comprovante_created
  AFTER INSERT ON comprovantes
  FOR EACH ROW
  EXECUTE FUNCTION link_comprovante_to_registro();

-- Função auxiliar para encontrar lotes sem registro
CREATE OR REPLACE FUNCTION get_lotes_without_registros()
RETURNS SETOF lotes AS $$
  SELECT l.* FROM lotes l
  LEFT JOIN registros r ON r.lote_id = l.id
  WHERE r.id IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;
