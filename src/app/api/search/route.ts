import { NextRequest, NextResponse } from 'next/server';
import * as streamplay from '@/lib/providers/streamplay';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  if (!q) return NextResponse.json({ ok: false, error: 'Missing query' }, { status: 400 });
  try {
    const data = await streamplay.search(q, page);
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
