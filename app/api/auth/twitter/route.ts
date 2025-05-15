import { NextResponse } from 'next/server';
import { getTwitterAuthUrl } from '@/lib/twitter-auth';

export async function GET() {
  try {
    const authUrl = getTwitterAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Twitter auth error:', error);
    return NextResponse.json({ error: 'Failed to initialize Twitter auth' }, { status: 500 });
  }
} 