'use client';

import { Badge } from '@/components/ui/badge';
import type { Etapa } from '@/types';

const etapaConfig: Record<Etapa, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'; label: string }> = {
  'Com pendências': { variant: 'destructive', label: 'Com pendências' },
  'Concluído': { variant: 'success', label: 'Concluído' },
  'Aguardando conclusão de registro +30 dias': { variant: 'warning', label: 'Aguard. conclusão +30d' },
  'Aguardando conclusão de registro': { variant: 'warning', label: 'Aguard. conclusão' },
  'Solicitar ITBI': { variant: 'default', label: 'Solicitar ITBI' },
  'Aguardando emissão guia ITBI': { variant: 'outline', label: 'Aguard. guia ITBI' },
  'Pagar ITBI': { variant: 'default', label: 'Pagar ITBI' },
  'ITBI pago/coletar assinaturas': { variant: 'default', label: 'Coletar assinaturas' },
  'Gatilho atingido': { variant: 'warning', label: 'Gatilho atingido' },
  'Vendido': { variant: 'secondary', label: 'Vendido' },
  'Propriedade Young': { variant: 'outline', label: 'Propriedade Young' },
};

export function EtapaBadge({ etapa }: { etapa: Etapa }) {
  const config = etapaConfig[etapa] || { variant: 'outline' as const, label: etapa };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
