/**
 * Lê a planilha publicada "Registros" (aba Base) e marca como Concluído
 * os registros cuja coluna Etapa [AUT] = Concluído.
 *
 * Concluído no sistema = data_recebimento_ri preenchida (ver calcularEtapa).
 *
 * Uso: npx tsx scripts/marcar-concluidos-planilha.ts
 * Opcional: npx tsx scripts/marcar-concluidos-planilha.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRegistrosClient, R, T } from './lib/supabase-registros';

const PLANILHA_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFjVNjvC4lxj86AfoP54CtN0VajAw5Nk2CvRniAfm3TeHEPr9RMBUgzcDw7Qngp08yX1p7jEKkxR4-/pub?output=csv';

const LOCAL_CSV = path.join(__dirname, 'tmp-planilha.csv');

/** Nomes da planilha → nomes no banco (quando diferem) */
const EMPREENDIMENTO_ALIASES: Record<string, string> = {
  'Parque Lorena': 'Parque Lorena l',
  'Parque Lorena I': 'Parque Lorena l',
  'Parque Lorena II': 'Parque Lorena ll',
  'Parque Lorena ll': 'Parque Lorena ll',
  'Algarve ': 'Algarve',
  'Morada da Coxilha ': 'Morada da Coxilha',
};

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('.env.local não encontrado');
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

function normalizeEmp(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

function resolveEmpNoBanco(planilhaNome: string, nomesNoBanco: Set<string>): string | null {
  const base = normalizeEmp(planilhaNome);
  const candidatos = [
    base,
    EMPREENDIMENTO_ALIASES[base],
    base.replace(/\bII\b/g, 'll'),
    base.replace(/\bll\b/gi, 'II'),
  ].filter(Boolean) as string[];

  for (const c of candidatos) {
    if (nomesNoBanco.has(c)) return c;
    for (const db of nomesNoBanco) {
      if (db.trim() === c.trim()) return db;
    }
  }
  return null;
}

function normalizeLote(num: string): string {
  const n = num.trim();
  if (!n) return '';
  const parsed = parseInt(n, 10);
  return Number.isNaN(parsed) ? n : String(parsed);
}

function isConcluido(etapa: string): boolean {
  const e = etapa
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return e.includes('concluid');
}

async function fetchAll<T>(
  supabase: ReturnType<typeof createClient>,
  table: string,
  select: string
): Promise<T[]> {
  const all: T[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function fetchPlanilhaCsv(): Promise<string> {
  if (fs.existsSync(LOCAL_CSV)) {
    const age = Date.now() - fs.statSync(LOCAL_CSV).mtimeMs;
    if (age < 3600_000) {
      console.log('Usando CSV local:', LOCAL_CSV);
      return fs.readFileSync(LOCAL_CSV, 'utf-8');
    }
  }
  console.log('Baixando planilha...');
  const res = await fetch(PLANILHA_URL);
  if (!res.ok) throw new Error(`Falha ao baixar planilha: ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(LOCAL_CSV, text, 'utf-8');
  return text;
}

function parseConcluidosFromCsv(text: string): Array<{ emp: string; lote: string; cliente: string }> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);
  const etapaIdx = header.findIndex((h) => h.includes('Etapa'));
  const empIdx = header.findIndex((h) => h.includes('Empreendimento'));
  const loteIdx = header.findIndex((h) => h.includes('Lote'));
  const clienteIdx = header.findIndex((h) => h.includes('Nome cliente'));

  if (etapaIdx < 0 || empIdx < 0 || loteIdx < 0) {
    throw new Error('Colunas esperadas não encontradas no CSV');
  }

  const rows: Array<{ emp: string; lote: string; cliente: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const etapa = parts[etapaIdx] || '';
    if (!isConcluido(etapa)) continue;

    const emp = normalizeEmp(parts[empIdx] || '');
    const lote = normalizeLote(parts[loteIdx] || '');
    if (!emp || !lote || lote === '0') continue;

    rows.push({
      emp,
      lote,
      cliente: (parts[clienteIdx] || '').trim(),
    });
  }
  return rows;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  loadEnv();

  const csv = await fetchPlanilhaCsv();
  const concluidos = parseConcluidosFromCsv(csv);
  console.log(`\nLinhas "Concluído" na planilha (Base): ${concluidos.length}\n`);

  const supabase = createRegistrosClient();

  type LoteRow = {
    id: string;
    numero: string;
    registros_empreendimentos: { nome: string } | { nome: string }[] | null;
  };
  type RegistroRow = { id: string; lote_id: string; data_recebimento_ri: string | null };

  const { data: empreendimentos } = await supabase.from(T.empreendimentos).select('nome');
  const nomesNoBanco = new Set((empreendimentos || []).map((e) => e.nome));

  const lotes = await fetchAll<LoteRow>(
    supabase,
    T.lotes,
    `id, numero, ${R.empreendimentos}(nome)`
  );
  const registros = await fetchAll<RegistroRow>(
    supabase,
    T.registros,
    'id, lote_id, data_recebimento_ri'
  );

  console.log(`Lotes no banco: ${lotes.length}, Registros: ${registros.length}`);

  const loteKey = (empNome: string, numero: string) => `${empNome}::${numero}`;

  const loteMap = new Map<string, string>();
  for (const l of lotes) {
    const empRaw = l.registros_empreendimentos;
    const emp = (Array.isArray(empRaw) ? empRaw[0]?.nome : empRaw?.nome)?.trim();
    if (!emp) continue;
    const empDb = resolveEmpNoBanco(emp, nomesNoBanco) || emp;
    const key = loteKey(empDb, normalizeLote(l.numero));
    loteMap.set(key, l.id);
  }

  const regByLote = new Map(registros.map((r) => [r.lote_id, r]));

  let updated = 0;
  let already = 0;
  const notFound: string[] = [];
  const hoje = new Date().toISOString().split('T')[0];

  for (const row of concluidos) {
    const empDb = resolveEmpNoBanco(row.emp, nomesNoBanco);
    if (!empDb) {
      notFound.push(`${row.emp} (empreendimento não existe no banco)`);
      continue;
    }
    const key = loteKey(empDb, row.lote);
    const loteId = loteMap.get(key);

    if (!loteId) {
      notFound.push(`${row.emp} lote ${row.lote}${row.cliente ? ` (${row.cliente})` : ''}`);
      continue;
    }

    const reg = regByLote.get(loteId);
    if (!reg) {
      notFound.push(`${row.emp} lote ${row.lote} — sem registro`);
      continue;
    }

    if (reg.data_recebimento_ri) {
      already++;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Marcar concluído: ${row.emp} lote ${row.lote}`);
      updated++;
      continue;
    }

    const { error } = await supabase
      .from(T.registros)
      .update({ data_recebimento_ri: hoje })
      .eq('id', reg.id);

    if (error) {
      console.error(`Erro ${row.emp} ${row.lote}:`, error.message);
    } else {
      updated++;
    }
  }

  console.log('\n=== Resultado ===');
  console.log(`Atualizados (Concluído): ${updated}`);
  console.log(`Já estavam concluídos: ${already}`);
  console.log(`Não encontrados no banco: ${notFound.length}`);

  if (notFound.length > 0 && notFound.length <= 40) {
    console.log('\nNão encontrados:');
    notFound.forEach((n) => console.log('  -', n));
  } else if (notFound.length > 40) {
    console.log('\nPrimeiros 40 não encontrados:');
    notFound.slice(0, 40).forEach((n) => console.log('  -', n));
  }

  if (dryRun) console.log('\n(dry-run — nenhuma alteração gravada)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
