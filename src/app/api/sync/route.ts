import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/sienge/sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.secret !== process.env.SYNC_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (data: object) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch {
        // stream closed
      }
    };

    (async () => {
      try {
        const result = await runSync(({ step, detail, percent }) => {
          sendEvent({ step, detail, percent });
        });
        await sendEvent({ step: 'done', detail: result.message, percent: 100, result });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        await sendEvent({ step: 'erro', detail: msg, percent: -1 });
      } finally {
        try {
          await writer.close();
        } catch {
          // already closed
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
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
