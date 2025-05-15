import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTwitterTokens, getTwitterUserData } from '@/lib/twitter-auth';
import dbConnect from '@/lib/mongoose/db';
import User from '@/lib/mongoose/models/user';
import { getPrivyUserFromCookie } from '@/lib/privy-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/auth/error?error=no_code', request.url));
    }

    // Get Privy user first
    const privyUser = await cookies();
    const privyUserId = privyUser.get('privy_user_id');
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

    // Update user with Twitter data and set userType to business
    await User.findOneAndUpdate(
      { privyId: privyUserId },
      {
        userType: 'business', // Set user type to business
        twitterHandle: twitterUser.username,
        twitterFollowers: twitterUser.followerCount,
        name: twitterUser.name || undefined,
      },
      { new: true }
    );

    // Store tokens securely
    const cookieStore = await cookies();
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