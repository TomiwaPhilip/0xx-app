import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongoose/db';
import User from '@/lib/mongoose/models/user';
import { getPrivyUserFromCookie } from '@/lib/privy-server';

export async function GET() {
  try {
    // Get user from Privy
    const privyUser = await getPrivyUserFromCookie();
    if (!privyUser) {
      return NextResponse.json({ connected: false });
    }

    await dbConnect();
    const user = await User.findOne({ privyId: privyUser.id });

    if (!user?.twitterHandle) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      twitterHandle: user.twitterHandle,
      twitterFollowers: user.twitterFollowers,
    });
  } catch (error) {
    console.error('Twitter verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
} 