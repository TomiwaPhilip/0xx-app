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

    // Get Privy user ID from cookie
    const cookieStore = await cookies();
    const privyUserId = cookieStore.get('privy_user_id')?.value;

    if (!privyUserId) {
      return NextResponse.redirect(new URL('/auth/error?error=not_authenticated', request.url));
    }

    // Exchange code for tokens
    const tokens = await getTwitterTokens(code);
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/auth/error?error=no_token', request.url));
    }

    // Get user data from Twitter
    const twitterUser = await getTwitterUserData(accessToken);

    await dbConnect();

    // Find user by Privy ID
    const user = await User.findOne({ privyId: privyUserId });
    if (!user) {
      return NextResponse.redirect(new URL('/auth/error?error=user_not_found', request.url));
    }

    // Update user with Twitter data
    await User.findByIdAndUpdate(user._id, {
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

    // Clean up the temporary privy_user_id cookie
    cookieStore.delete('privy_user_id');

    return NextResponse.redirect(new URL('/settings', request.url));
  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=callback_failed', request.url));
  }
} 