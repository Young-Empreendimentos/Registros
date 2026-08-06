import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceKey, getSupabaseUrl } from './config';

export function createServiceClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceKey());
}

/**
 * Cliente com escopo no schema 'registros' (tabelas/views/matview do app,
 * movidas de public para o schema próprio). Use para .from() das tabelas
 * registros_*. RPC, auth e storage continuam no createServiceClient (public),
 * pois as funções permanecem em public.
 */
export function createRegistrosClient() {
  return createServiceClient().schema('registros' as unknown as 'public');
}
