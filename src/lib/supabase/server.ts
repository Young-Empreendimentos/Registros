import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceKey, getSupabaseUrl } from './config';

export function createServiceClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceKey());
}
