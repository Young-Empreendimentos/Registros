import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// Botão "Atualizar valores pagos agora" (Configurações).
// Chama a função que dá REFRESH na matview do valor pago (a função fica em public).
export async function POST() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.rpc('registros_refresh_valor_pago');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar valores' },
      { status: 500 }
    );
  }
}
