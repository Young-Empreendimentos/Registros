/** Banco único: espelho Sienge (sienge_* + registros_*) */
export function getSupabaseUrl(): string {
  return process.env.SUPABASE_TI_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

export function getSupabaseServiceKey(): string {
  return (
    process.env.SUPABASE_TI_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.SUPABASE_TI_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
