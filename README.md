# Controle de Registros — Young Empreendimentos

Sistema web para acompanhar o fluxo pós-venda de registro de imóveis (ITBI, cartório, matrícula) por lote e empreendimento.

**Repositório:** [github.com/YoungEmpreendimentos/Registros](https://github.com/YoungEmpreendimentos/Registros)

**Documentação no app:** menu lateral → **Ajuda** (`/ajuda`). Atualize `src/content/ajuda-content.ts` quando mudar sync, schema ou campos.

## Arquitetura de dados

Um único banco Supabase (espelho Sienge, `vvtympzatclvjaqucebr`):

```
API Sienge  →  ingestão diária  →  sienge_*
sienge_*  →  sync  →  registros_*  (empreendimentos, lotes, contratos, registros, …)
```

O sistema **não consulta a API Sienge em tempo real** no uso diário; apenas o job de ingestão chama a API.

O projeto legado `atfsixsamqwndwnfvpdy` foi descontinuado — dados migrados para `registros_*` no espelho.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Login em `/login`.

## Sincronização

| Comando | Descrição |
|---------|-----------|
| `npm run ingest-sienge` | API Sienge → `sienge_*` |
| `npm run sync` | `sienge_*` → `registros_*` |
| `npm run pipeline-diario` | Ingestão + sync |

Cron automático: **02:00** (America/Sao_Paulo) via `server.js` → `POST /api/pipeline-diario`.

## Migração do banco antigo

1. Executar `supabase-ti/migrations/002_registros_schema.sql` no SQL Editor do espelho.
2. Configurar `.env.local` (ver `.env.example`).
3. `npm run migrar-dados-para-espelho` — copia do projeto `atfsixsamqwndwnfvpdy` (requer `SUPABASE_LEGACY_*`).

## Variáveis de ambiente

Copie `.env.example` para `.env.local`:

- `SUPABASE_TI_URL` / `SUPABASE_TI_SERVICE_KEY` / `SUPABASE_TI_ANON_KEY` — banco único
- `SIENGE_*` — credenciais API (apenas ingestão)
- `SYNC_API_SECRET` — protege endpoints de sync
- `SUPABASE_LEGACY_*` — opcional, só para migração de dados

## Migrations

SQL em `supabase-ti/migrations/` — executar no banco do espelho (`vvtympzatclvjaqucebr`).

Migrations em `supabase/migrations/` referem-se ao projeto legado (histórico).

## Deploy no Hetzner (Docker)

Guia completo: [deploy/DEPLOY-HETZNER.md](deploy/DEPLOY-HETZNER.md)

Resumo no servidor:

```bash
cd /opt/registros && git pull
docker compose build && docker compose up -d
```

Da sua máquina (após configurar SSH):

```powershell
$env:DEPLOY_HOST = "IP_DO_SERVIDOR"
.\deploy\deploy-remoto.ps1
```
