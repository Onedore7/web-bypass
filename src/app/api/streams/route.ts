import { NextRequest, NextResponse } from 'next/server';
import * as watch32 from '@/lib/providers/watch32';
import * as kisskh from '@/lib/providers/kisskh';
import * as streamplay from '@/lib/providers/streamplay';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const provider = searchParams.get('provider') || 'streamplay';
  const data = searchParams.get('data') || '';
  if (!data) return NextResponse.json({ ok: false, error: 'Missing data' }, { status: 400 });
  try {
    let streams;
    if (provider === 'watch32') streams = await watch32.getStreams(data);
    else if (provider === 'kisskh') {
      const [video, subs] = await Promise.all([kisskh.getStreams(data), kisskh.getSubtitles(data)]);
      return NextResponse.json({ ok: true, streams: video, subtitles: subs });
    } else streams = await streamplay.getStreams(data);
    return NextResponse.json({ ok: true, streams });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
