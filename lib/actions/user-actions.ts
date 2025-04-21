"use server"
import { getPrivyUserFromCookie } from "@/lib/privy-server"
import clientPromise from "@/lib/mongodb"
import type { User } from "@/lib/types"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

export async function getUser(): Promise<User | null> {
  try {
    const privyUser = await getPrivyUserFromCookie()
    if (!privyUser) return null

    const client = await clientPromise
    const db = client.db("zora")

    // Find or create user
    let user = await db.collection("users").findOne({ privyId: privyUser.id })

    if (!user) {
      // Create new user
      const newUser = {
        privyId: privyUser.id,
        email: privyUser.email?.address,
        walletAddress: privyUser.wallet?.address,
        name: privyUser.name,
        userType: "normal", // Default to normal user
        supportedProjects: [],
        createdProjects: [],
        following: [],
        followers: [],
        supportsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await db.collection("users").insertOne(newUser)
      user = {
        ...newUser,
        _id: result.insertedId,
      }
    }

    return {
      ...user,
      _id: user._id.toString(),
    } as User
  } catch (error) {
    console.error("Failed to get user:", error)
    return null
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const client = await clientPromise
    const db = client.db("zora")

    const user = await db.collection("users").findOne({ _id: new ObjectId(id) })

    if (!user) return null

    return {
      ...user,
      _id: user._id.toString(),
    } as User
  } catch (error) {
    console.error("Failed to get user by ID:", error)
    return null
  }
}

export async function upgradeToBusinessUser(data: {
  userId: string
  twitterHandle: string
  twitterFollowers: number
  bio?: string
}): Promise<boolean> {
  try {
    const { userId, twitterHandle, twitterFollowers, bio } = data

    // Verify follower count requirement
    if (twitterFollowers < 10000) {
      throw new Error("Insufficient Twitter followers")
    }

    const client = await clientPromise
    const db = client.db("zora")

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          userType: "business",
          twitterHandle,
          twitterFollowers,
          bio,
          updatedAt: new Date(),
        },
      },
    )

    revalidatePath(`/profile/${userId}`)
    return true
  } catch (error) {
    console.error("Failed to upgrade user:", error)
    return false
  }
}

export async function followUser(userId: string, targetUserId: string): Promise<boolean> {
  try {
    if (userId === targetUserId) {
      throw new Error("Cannot follow yourself")
    }

    const client = await clientPromise
    const db = client.db("zora")

    // Add target user to current user's following list
    await db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $addToSet: { following: targetUserId } })

    // Add current user to target user's followers list
    await db.collection("users").updateOne({ _id: new ObjectId(targetUserId) }, { $addToSet: { followers: userId } })

    revalidatePath(`/profile/${userId}`)
    revalidatePath(`/profile/${targetUserId}`)
    return true
  } catch (error) {
    console.error("Failed to follow user:", error)
    return false
  }
}

export async function unfollowUser(userId: string, targetUserId: string): Promise<boolean> {
  try {
    const client = await clientPromise
    const db = client.db("zora")

    // Remove target user from current user's following list
    await db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $pull: { following: targetUserId } })

    // Remove current user from target user's followers list
    await db.collection("users").updateOne({ _id: new ObjectId(targetUserId) }, { $pull: { followers: userId } })

    revalidatePath(`/profile/${userId}`)
    revalidatePath(`/profile/${targetUserId}`)
    return true
  } catch (error) {
    console.error("Failed to unfollow user:", error)
    return false
  }
}

export async function updateUserProfile(data: {
  userId: string
  name?: string
  bio?: string
  profileImage?: string | null
  coverImage?: string | null
}): Promise<boolean> {
  try {
    const { userId, ...updateData } = data

    const client = await clientPromise
    const db = client.db("zora")

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    )

    revalidatePath(`/profile/${userId}`)
    revalidatePath(`/settings`)
    return true
  } catch (error) {
    console.error("Failed to update user profile:", error)
    return false
  }
}

export async function updateNotificationSettings(data: {
  userId: string
  emailNotifications?: boolean
  supportNotifications?: boolean
  commentNotifications?: boolean
}): Promise<boolean> {
  try {
    const { userId, ...settings } = data

    const client = await clientPromise
    const db = client.db("zora")

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          notificationSettings: settings,
          updatedAt: new Date(),
        },
      },
    )

    revalidatePath(`/settings`)
    return true
  } catch (error) {
    console.error("Failed to update notification settings:", error)
    return false
  }
}

export async function updatePrivacySettings(data: {
  userId: string
  publicProfile?: boolean
  showSupporters?: boolean
}): Promise<boolean> {
  try {
    const { userId, ...settings } = data

    const client = await clientPromise
    const db = client.db("zora")

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          privacySettings: settings,
          updatedAt: new Date(),
        },
      },
    )

    revalidatePath(`/settings`)
    revalidatePath(`/profile/${userId}`)
    return true
  } catch (error) {
    console.error("Failed to update privacy settings:", error)
    return false
  }
}
