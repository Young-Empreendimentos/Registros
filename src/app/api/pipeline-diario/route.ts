import { NextRequest, NextResponse } from 'next/server';
import { runSiengeIngest } from '@/lib/sienge/ingest';
import { runSync } from '@/lib/sienge/sync';

/**
 * Pipeline diário: API Sienge → sienge_* → registros_*
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.secret !== process.env.SYNC_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ingest = await runSiengeIngest();
    if (!ingest.success) {
      return NextResponse.json(
        { step: 'ingest', success: false, ingest, sync: null },
        { status: 500 }
      );
    }

    const sync = await runSync();
    return NextResponse.json({
      step: 'complete',
      success: sync.success,
      ingest,
      sync,
    });
  } catch (error) {
    console.error('Pipeline error:', error);
    return NextResponse.json(
      { error: 'Pipeline failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Pipeline diário (ingest + sync). Use POST com { secret }.',
  });
}
