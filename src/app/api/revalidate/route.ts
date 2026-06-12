import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { ROOMS_CACHE_TAG } from '@/lib/cache';

// Called by the data pipeline after a scrape so fresh data is live
// immediately instead of waiting out the hourly cache revalidation.
//   curl -X POST https://<app>/api/revalidate -H "x-revalidate-secret: <secret>"
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag(ROOMS_CACHE_TAG);
  return NextResponse.json({ revalidated: true });
}
