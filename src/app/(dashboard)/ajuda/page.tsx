import Link from 'next/link';
import {
  ULTIMA_ATUALIZACAO_AJUDA,
  VERSAO_AJUDA,
  GITHUB_REPO_URL,
  EMPREENDIMENTOS_PERMITIDOS,
  PAPEIS_USUARIO,
  ETAPAS_REGISTRO,
  GLOSSARIO_CAMPOS,
  SYNC_INFO,
  BANCOS_INFO,
  BANCO_SUPABASE_ESPELHO,
  BANCO_SUPABASE_REGISTROS,
  ORIGEM_DADOS,
  MANUTENCAO_ITENS,
} from '@/content/ajuda-content';

const TOC = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'origem-dados', label: 'O que vem de cada fonte' },
  { id: 'github', label: 'Repositório GitHub' },
  { id: 'sincronizacao', label: 'Sincronização' },
  { id: 'bancos', label: 'Bancos de dados' },
  { id: 'papeis', label: 'Papéis de usuário' },
  { id: 'campos', label: 'Glossário de campos' },
  { id: 'etapas', label: 'Etapas' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'empreendimentos', label: 'Empreendimentos' },
];

export default function AjudaPage() {
  return (
    <div className="help-page">
      <div className="help-intro">
        <h1>Ajuda — Controle de Registros</h1>
        <p>
          Documentação do sistema Young Empreendimentos. Última atualização:{' '}
          {ULTIMA_ATUALIZACAO_AJUDA} (v{VERSAO_AJUDA}).
        </p>
        <p className="help-alert" style={{ marginTop: 16 }}>
          Esta página deve ser atualizada em{' '}
          <code className="text-sm">src/content/ajuda-content.ts</code> sempre que
          houver mudanças em sync, banco, campos ou fluxos.
        </p>
      </div>

      <nav className="help-toc" aria-label="Índice">
        <h2>Índice</h2>
        <ul>
          {TOC.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="visao-geral" className="help-section">
        <h2>Visão geral</h2>
        <p>
          O sistema controla o fluxo pós-venda de registro de imóveis (ITBI, cartório,
          matrícula) por lote/empreendimento. Os dados cadastrais e financeiros vêm do
          Sienge, mas o aplicativo <strong>não chama a API Sienge em tempo real</strong>:
          usa um espelho no <strong>{BANCO_SUPABASE_ESPELHO}</strong>, atualizado
          diariamente (tabelas <code>sienge_*</code>).
        </p>
        <pre className="help-code">{`API Sienge  →  (ingestão 1x/dia)  →  sienge_*
sienge_*  →  (sync)  →  registros_*`}</pre>
      </section>

      <section id="origem-dados" className="help-section">
        <h2>O que puxa do Sienge e o que puxa do Supabase</h2>
        <p>{ORIGEM_DADOS.usoDiario}</p>

        <h3>{ORIGEM_DADOS.siengeApi.titulo}</h3>
        <p>
          <strong>Quando:</strong> {ORIGEM_DADOS.siengeApi.quando}
          <br />
          <strong>Destino:</strong> {ORIGEM_DADOS.siengeApi.destino}
        </p>
        <table className="help-table">
          <thead>
            <tr>
              <th>Dado</th>
              <th>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {ORIGEM_DADOS.siengeApi.itens.map((item) => (
              <tr key={item.dado}>
                <td>
                  <strong>{item.dado}</strong>
                </td>
                <td>{item.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-orange-800 mt-3">
          <strong>A ingestão não puxa da API Sienge:</strong>
        </p>
        <ul>
          {ORIGEM_DADOS.siengeApi.naoPuxa.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h3>{ORIGEM_DADOS.supabaseEspelho.titulo}</h3>
        <p>
          <strong>Quando:</strong> {ORIGEM_DADOS.supabaseEspelho.quando}
        </p>
        <table className="help-table">
          <thead>
            <tr>
              <th>Tabela</th>
              <th>Uso na sync / no sistema</th>
            </tr>
          </thead>
          <tbody>
            {ORIGEM_DADOS.supabaseEspelho.itens.map((item) => (
              <tr key={item.dado}>
                <td>
                  <code>{item.dado}</code>
                </td>
                <td>{item.uso}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>{ORIGEM_DADOS.supabaseRegistros.titulo}</h3>
        <p>
          <strong>Quando:</strong> {ORIGEM_DADOS.supabaseRegistros.quando}
        </p>
        <h4 className="text-sm font-semibold text-orange-900 mt-4">Atualizado pela sync (a partir do espelho Supabase)</h4>
        <ul>
          {ORIGEM_DADOS.supabaseRegistros.atualizadoPelaSync.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h4 className="text-sm font-semibold text-orange-900 mt-4">Preenchido só pela equipe (não vem do Sienge)</h4>
        <ul>
          {ORIGEM_DADOS.supabaseRegistros.somenteEquipe.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h4 className="text-sm font-semibold text-orange-900 mt-4">Calculado no app (não é coluna importada)</h4>
        <ul>
          {ORIGEM_DADOS.supabaseRegistros.calculadoNoApp.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="github" className="help-section">
        <h2>Repositório GitHub</h2>
        <p>
          Código-fonte:{' '}
          <Link href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
            github.com/YoungEmpreendimentos/Registros
          </Link>
        </p>
        <p>
          Issues, pull requests e histórico de alterações ficam nesse repositório.
        </p>
      </section>

      <section id="sincronizacao" className="help-section">
        <h2>Sincronização</h2>

        <h3>Frequência e horário (automático)</h3>
        <table className="help-table">
          <tbody>
            <tr>
              <th>Frequência</th>
              <td>{SYNC_INFO.frequencia}</td>
            </tr>
            <tr>
              <th>Horário</th>
              <td>
                {SYNC_INFO.horario} ({SYNC_INFO.fuso})
              </td>
            </tr>
            <tr>
              <th>O que roda</th>
              <td>
                Pipeline completo: ingestão Sienge → {BANCO_SUPABASE_ESPELHO}, depois sync →{' '}
                {BANCO_SUPABASE_REGISTROS}
              </td>
            </tr>
            <tr>
              <th>Requisito</th>
              <td>{SYNC_INFO.servidor}</td>
            </tr>
          </tbody>
        </table>

        <h3>Quais sincronizações existem</h3>
        <table className="help-table">
          <thead>
            <tr>
              <th>Sincronização</th>
              <th>Quando</th>
              <th>Frequência</th>
              <th>Etapas</th>
            </tr>
          </thead>
          <tbody>
            {SYNC_INFO.sincronizacoes.map((s) => (
              <tr key={s.nome}>
                <td>
                  <strong>{s.nome}</strong>
                </td>
                <td>{s.quando}</td>
                <td>{s.frequencia}</td>
                <td>{s.etapas}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-4 mt-4">
          {SYNC_INFO.sincronizacoes.map((s) => (
            <div key={`det-${s.nome}`}>
              <h4 className="text-sm font-semibold text-orange-900 mb-1">{s.nome}</h4>
              <p className="text-sm text-orange-800 mb-1">{s.oQueFaz}</p>
              <p className="text-xs text-orange-700">
                <strong>Disparo:</strong> {s.disparo}
              </p>
              {'tabelasTi' in s && s.tabelasTi && (
                <p className="text-xs text-orange-700 mt-1">
                  <strong>Tabelas no Supabase (espelho):</strong>{' '}
                  {s.tabelasTi.map((t) => (
                    <code key={t} className="mr-1">
                      {t}
                    </code>
                  ))}
                </p>
              )}
              {'tabelasPrincipal' in s && s.tabelasPrincipal && (
                <p className="text-xs text-orange-700 mt-1">
                  <strong>Tabelas registros_*:</strong>{' '}
                  {s.tabelasPrincipal.map((t) => (
                    <code key={t} className="mr-1">
                      {t}
                    </code>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>

        <h3>Endpoints</h3>
        <ul>
          <li>
            <code>{SYNC_INFO.endpointPipeline}</code> — pipeline (ingestão + sync)
          </li>
          <li>
            <code>{SYNC_INFO.endpointSync}</code> — somente sync
          </li>
          <li>
            <code>{SYNC_INFO.endpointIngest}</code> — somente ingestão
          </li>
        </ul>

        <h3>Comandos manuais (terminal)</h3>
        <table className="help-table">
          <thead>
            <tr>
              <th>Comando</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {SYNC_INFO.comandos.map((c) => (
              <tr key={c.cmd}>
                <td>
                  <code>{c.cmd}</code>
                </td>
                <td>{c.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Etapas do pipeline automático (02:00)</h3>
        <ol>
          {SYNC_INFO.pipelineEtapas.map((etapa) => (
            <li key={etapa.nome}>
              <strong>{etapa.nome}</strong> — {etapa.descricao}
            </li>
          ))}
        </ol>
        <p>{SYNC_INFO.notaRecebimentos}</p>
      </section>

      <section id="bancos" className="help-section">
        <h2>Banco de dados</h2>
        <h3>{BANCOS_INFO.unico.nome}</h3>
        <p>
          Variáveis: <code>{BANCOS_INFO.unico.env}</code>
        </p>
        <h4 className="text-sm font-semibold mt-3">Tabelas Sienge (ingestão)</h4>
        <ul>
          {BANCOS_INFO.unico.tabelasSienge.map((t) => (
            <li key={t}>
              <code>{t}</code>
            </li>
          ))}
        </ul>
        <h4 className="text-sm font-semibold mt-3">Tabelas do app (registros_*)</h4>
        <ul>
          {BANCOS_INFO.unico.tabelasRegistros.map((t) => (
            <li key={t}>
              <code>{t}</code>
            </li>
          ))}
        </ul>
        <p className="help-alert">
          Credenciais nunca aparecem nesta tela — ficam apenas no servidor (.env.local).
        </p>
      </section>

      <section id="papeis" className="help-section">
        <h2>Papéis de usuário</h2>
        <table className="help-table">
          <thead>
            <tr>
              <th>Papel</th>
              <th>Permissões</th>
            </tr>
          </thead>
          <tbody>
            {PAPEIS_USUARIO.map((p) => (
              <tr key={p.papel}>
                <td>
                  <strong>{p.papel}</strong>
                </td>
                <td>{p.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="campos" className="help-section">
        <h2>Glossário de campos (planilha / registros)</h2>
        <table className="help-table">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Significado</th>
            </tr>
          </thead>
          <tbody>
            {GLOSSARIO_CAMPOS.map((g) => (
              <tr key={g.campo}>
                <td>
                  <strong>{g.campo}</strong>
                </td>
                <td>{g.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="etapas" className="help-section">
        <h2>Etapas do registro</h2>
        <p>Calculadas automaticamente conforme preenchimento e regras de negócio:</p>
        <ul>
          {ETAPAS_REGISTRO.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </section>

      <section id="manutencao" className="help-section">
        <h2>Manutenção</h2>
        <ul>
          {MANUTENCAO_ITENS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="empreendimentos" className="help-section">
        <h2>Empreendimentos sincronizados</h2>
        <p>IDs Sienge permitidos no sync:</p>
        <table className="help-table">
          <thead>
            <tr>
              <th>ID Sienge</th>
              <th>Nome</th>
            </tr>
          </thead>
          <tbody>
            {EMPREENDIMENTOS_PERMITIDOS.map((e) => (
              <tr key={e.id}>
                <td>{e.id}</td>
                <td>{e.nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
