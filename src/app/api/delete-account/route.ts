import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Permanently delete the signed-in user's account and all of their data.
// Deleting the auth.users row cascades to profiles, which cascades to the
// user's comments, place_comments, favorites, ratings, and comment upvotes
// (every child table references profiles ... on delete cascade).
//
// Deleting an auth user requires the service-role key, which must never reach
// the client — so this runs server-side. The caller proves who they are with
// their own access token; we only ever delete that verified user.
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Validate the token and resolve it to a user id; never trust a client-sent id.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Session expired. Sign in again.' }, { status: 401 });
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(userData.user.id);
  if (delErr) {
    return NextResponse.json({ error: 'Could not delete account. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
