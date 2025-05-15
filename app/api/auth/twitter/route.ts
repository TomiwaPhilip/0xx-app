import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTwitterAuthUrl } from '@/lib/twitter-auth';
import { getPrivyUserFromCookie } from '@/lib/privy-server';

export async function GET() {
  try {
    // Get Privy user first
    const privyUser = await getPrivyUserFromCookie();
    if (!privyUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Save Privy user ID in cookie for the callback
    const cookieStore = await cookies();
    cookieStore.set('privy_user_id', privyUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes, just enough for the OAuth flow
    });

    const authUrl = getTwitterAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Twitter auth error:', error);
    return NextResponse.json({ error: 'Failed to initialize Twitter auth' }, { status: 500 });
  }
} 