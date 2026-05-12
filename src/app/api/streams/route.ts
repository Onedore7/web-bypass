import { NextRequest, NextResponse } from 'next/server';
import * as streamplay from '@/lib/providers/streamplay';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const data = searchParams.get('data') || '';
  if (!data) return NextResponse.json({ ok: false, error: 'Missing data' }, { status: 400 });
  try {
    const streams = await streamplay.getStreams(data);
    return NextResponse.json({ ok: true, streams });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
