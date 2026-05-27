/** Tabelas do app no banco espelho Sienge (projeto vvtympzatclvjaqucebr) */
export const T = {
  usuarios: 'registros_usuarios',
  empreendimentos: 'registros_empreendimentos',
  lotes: 'registros_lotes',
  contratos: 'registros_contratos',
  registros: 'registros_registros',
  comprovantes: 'registros_comprovantes',
  sync_logs: 'registros_sync_logs',
} as const;

/** Relacionamentos PostgREST em selects aninhados */
export const R = {
  empreendimentos: 'registros_empreendimentos',
  lotes: 'registros_lotes',
} as const;

export const RPC = {
  get_lotes_without_registros: 'registros_get_lotes_without_registros',
} as const;
