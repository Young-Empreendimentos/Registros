-- Enum para roles de usuário
CREATE TYPE user_role AS ENUM ('admin', 'direcao', 'operador', 'leitura');

-- Tabela de perfis (extensão do Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'leitura',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  uploaded_by UUID REFERENCES profiles(id),
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

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nome, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'leitura');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

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

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE empreendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprovantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Todos os usuários autenticados podem ler
CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can read empreendimentos"
  ON empreendimentos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage empreendimentos"
  ON empreendimentos FOR ALL TO service_role
  USING (true);

CREATE POLICY "Users can read lotes"
  ON lotes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage lotes"
  ON lotes FOR ALL TO service_role
  USING (true);

CREATE POLICY "Users can read contratos"
  ON contratos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage contratos"
  ON contratos FOR ALL TO service_role
  USING (true);

CREATE POLICY "Users can read registros"
  ON registros FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Operadores+ can update registros"
  ON registros FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'direcao', 'operador'))
  );

CREATE POLICY "Service role can manage registros"
  ON registros FOR ALL TO service_role
  USING (true);

CREATE POLICY "Users can read comprovantes"
  ON comprovantes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Operadores+ can insert comprovantes"
  ON comprovantes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'direcao', 'operador'))
  );

CREATE POLICY "Service role can manage comprovantes"
  ON comprovantes FOR ALL TO service_role
  USING (true);

CREATE POLICY "Users can read sync_logs"
  ON sync_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage sync_logs"
  ON sync_logs FOR ALL TO service_role
  USING (true);

-- Função auxiliar para encontrar lotes sem registro
CREATE OR REPLACE FUNCTION get_lotes_without_registros()
RETURNS SETOF lotes AS $$
  SELECT l.* FROM lotes l
  LEFT JOIN registros r ON r.lote_id = l.id
  WHERE r.id IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;
