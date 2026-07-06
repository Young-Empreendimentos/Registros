import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { T } from '@/lib/supabase/tables';

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data: logs, error } = await supabase
      .from(T.sync_logs)
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
