import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTwitterTokens, getTwitterUserData } from '@/lib/twitter-auth';
import dbConnect from '@/lib/mongoose/db';
import User from '@/lib/mongoose/models/user';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/auth/error?error=no_code', request.url));
    }

    // Exchange code for tokens
    const tokens = await getTwitterTokens(code);
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/auth/error?error=no_token', request.url));
    }

    // Get user data from Twitter
    const twitterUser = await getTwitterUserData(accessToken);

    // Get user ID from session/cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.redirect(new URL('/auth/error?error=no_user', request.url));
    }

    await dbConnect();

    // Update user with Twitter data
    await User.findByIdAndUpdate(userId, {
      twitterHandle: twitterUser.username,
      twitterFollowers: twitterUser.followerCount,
      name: twitterUser.name || undefined,
    });

    // Store tokens securely
    cookieStore.set('twitter_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.redirect(new URL('/settings', request.url));
  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=callback_failed', request.url));
  }
} 