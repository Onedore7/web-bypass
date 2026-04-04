import { NextRequest, NextResponse } from 'next/server';
import * as pencurimovie from '@/lib/providers/pencurimovie';
import * as kisskh from '@/lib/providers/kisskh';
import * as streamplay from '@/lib/providers/streamplay';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const provider = searchParams.get('provider') || 'streamplay';
  const page = parseInt(searchParams.get('page') || '1');
  try {
    let data;
    if (provider === 'pencurimovie') data = await pencurimovie.getHome(page);
    else if (provider === 'kisskh') data = await kisskh.getHome(page);
    else data = await streamplay.getHome(page);
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
