import { NextRequest, NextResponse } from 'next/server';
import * as watch32 from '@/lib/providers/watch32';
import * as kisskh from '@/lib/providers/kisskh';
import * as streamplay from '@/lib/providers/streamplay';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const provider = searchParams.get('provider') || 'streamplay';
  const id = searchParams.get('id') || '';
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
  try {
    let data;
    if (provider === 'watch32') data = await watch32.getDetail(id);
    else if (provider === 'kisskh') data = await kisskh.getDetail(id);
    else data = await streamplay.getDetail(id);
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
