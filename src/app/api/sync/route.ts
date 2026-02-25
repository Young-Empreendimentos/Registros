import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/sienge/sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.secret !== process.env.SYNC_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Sync endpoint ready. Use POST to trigger.' });
}
