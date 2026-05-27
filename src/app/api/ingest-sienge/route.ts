import { NextRequest, NextResponse } from 'next/server';
import { runSiengeIngest } from '@/lib/sienge/ingest';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.secret !== process.env.SYNC_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runSiengeIngest();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { error: 'Ingest failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Ingest Sienge → TI. Use POST com { secret } para executar.',
  });
}
