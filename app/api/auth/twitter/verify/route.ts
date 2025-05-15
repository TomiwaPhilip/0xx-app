import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongoose/db';
import User from '@/lib/mongoose/models/user';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const twitterAccessToken = cookieStore.get('twitter_access_token')?.value;

    if (!userId || !twitterAccessToken) {
      return NextResponse.json({ connected: false });
    }

    await dbConnect();
    const user = await User.findById(userId);

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