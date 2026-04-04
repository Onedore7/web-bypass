import { NextRequest, NextResponse } from 'next/server';
import * as pencurimovie from '@/lib/providers/pencurimovie';
import * as kisskh from '@/lib/providers/kisskh';
import * as streamplay from '@/lib/providers/streamplay';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const provider = searchParams.get('provider') || 'streamplay';
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  if (!q) return NextResponse.json({ ok: false, error: 'Missing query' }, { status: 400 });
  try {
    let data;
    if (provider === 'pencurimovie') data = await pencurimovie.search(q);
    else if (provider === 'kisskh') data = await kisskh.search(q);
    else data = await streamplay.search(q, page);
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
