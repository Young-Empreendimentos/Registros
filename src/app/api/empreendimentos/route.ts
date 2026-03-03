import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// Empreendimentos permitidos (sienge_id -> nome):
// 1    - Parque da Guarda Residence
// 2    - Jardim do Parque
// 2003 - Montecarlo
// 2004 - Ilha dos Açores
// 2005 - Aurora
// 2007 - Parque Lorena l
// 2009 - Parque Lorena II
// 2010 - Erico Verissimo
// 2011 - Algarve
// 2014 - Morada da Coxilha
const ALLOWED_ENTERPRISE_IDS = [1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014];

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('empreendimentos')
    .select('*')
    .in('sienge_id', ALLOWED_ENTERPRISE_IDS)
    .order('nome');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ empreendimentos: data });
}
