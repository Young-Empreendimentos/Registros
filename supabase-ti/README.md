# Supabase TI — espelho Sienge

O banco TI armazena dados da API Sienge nas tabelas `sienge_*`. O sistema de registros **só lê** deste banco; a API Sienge é chamada apenas pelo job diário de ingestão.

## Tabelas utilizadas

| Tabela | Origem API | Uso no sistema |
|--------|------------|----------------|
| `sienge_contratos_de_vendas` | `/sales-contracts` | Contratos, empreendimentos |
| `sienge_contrato_unidades` | `salesContractUnits` | Vínculo contrato → lote |
| `sienge_contrato_clientes` | `salesContractCustomers` | Cliente principal |
| `sienge_clientes` | `/customers/{id}` | Nome e e-mail |
| `sienge_unidades` | `/units` | Lotes e valor à vista |
| `sienge_parcelas_receber` | *(outro processo TI)* | Valor já pago |

## Migration obrigatória

Antes da primeira ingestão, execute no SQL Editor do projeto TI:

`migrations/001_extend_sienge_unidades.sql`

Isso adiciona `enterprise_id` e `terrain_value` em `sienge_unidades` (necessário para `valor_avista` nos lotes).

## Comandos

```bash
# Só ingestão: API Sienge → Supabase TI
npm run ingest-sienge

# Só sync: Supabase TI → sistema de registros
npm run sync

# Pipeline completo (recomendado 1x/dia)
npm run pipeline-diario
```

Cron automático (via `server.js`): 02:00 — chama `/api/pipeline-diario`.
