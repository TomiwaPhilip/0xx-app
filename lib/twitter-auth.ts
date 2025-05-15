// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/api/auth/twitter/callback';
const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

export function getTwitterAuthUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_CALLBACK_URL,
    scope: 'tweet.read users.read follows.read offline.access',
    state: 'state',
    code_challenge: 'challenge',
    code_challenge_method: 'plain'
  });

  return `${TWITTER_AUTH_URL}?${params.toString()}`;
}

export async function getTwitterTokens(code: string) {
  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_CALLBACK_URL,
    code_verifier: 'challenge'
  });

  const basicAuth = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  return response.json();
}

export async function getTwitterUserData(accessToken: string) {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=public_metrics', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Twitter user data');
  }

  const data = await response.json();
  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
    followerCount: data.data.public_metrics.followers_count,
  };
}

export async function verifyTwitterFollowers(username: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Twitter user data');
    }

    const data = await response.json();
    return data.data.public_metrics.followers_count || 0;
  } catch (error) {
    console.error('Error verifying Twitter followers:', error);
    throw error;
  }
} 