"use server"

import { headers } from "next/headers"

const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_URL = "https://api.twitter.com/2"

/**
 * Verifies the follower count for a given Twitter username
 * @param username Twitter username to verify
 * @returns The number of followers
 */
export async function verifyTwitterFollowers(username: string): Promise<number> {
  if (!TWITTER_API_KEY) {
    throw new Error("Twitter API key not configured")
  }

  try {
    // First get the user ID from username
    const userResponse = await fetch(
      `${TWITTER_API_URL}/users/by/username/${username}?user.fields=public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${TWITTER_API_KEY}`,
        },
      }
    )

    if (!userResponse.ok) {
      throw new Error("Failed to fetch Twitter user data")
    }

    const userData = await userResponse.json()
    
    if (!userData.data) {
      throw new Error("Twitter user not found")
    }

    return userData.data.public_metrics.followers_count || 0
  } catch (error) {
    console.error("Error verifying Twitter followers:", error)
    throw error
  }
} 