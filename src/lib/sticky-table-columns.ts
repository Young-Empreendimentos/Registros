/** Colunas fixas (sticky) em tabelas com scroll */

export const STICKY_SHADOW = 'shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)]';

export type StickyColumnConfig = {
  col1Width: number;
  col2Width: number;
  col2Left: number;
};

/** Emp./Lote + Cliente — Registros, Em Andamento, Empreendimento */
export const STICKY_REGISTROS: StickyColumnConfig = {
  col1Width: 140,
  col2Width: 150,
  col2Left: 140,
};

/** Lote + Empreendimento — Análise, Comprovantes */
export const STICKY_LOTE_EMP: StickyColumnConfig = {
  col1Width: 100,
  col2Width: 180,
  col2Left: 100,
};
