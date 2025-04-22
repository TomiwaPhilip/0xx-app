"use server"

import { getPrivyUserFromCookie } from "@/lib/privy-server"
import dbConnect from "@/lib/mongoose/db"
import User from "@/lib/mongoose/models/user"
import { revalidatePath } from "next/cache"
import type { User as UserType } from "@/lib/types"

export async function getUser(): Promise<UserType | null> {
  try {
    const privyUser = await getPrivyUserFromCookie()
    if (!privyUser) return null

    await dbConnect()

    // Find or create user
    let user = await User.findOne({ privyId: privyUser.id })

    if (!user) {
      // Create new user
      user = new User({
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
      })

      await user.save()
    }

    return {
      ...user.toObject(),
      _id: user._id.toString(),
    } as UserType
  } catch (error) {
    console.error("Failed to get user:", error)
    return null
  }
}

export async function getUserById(id: string): Promise<UserType | null> {
  try {
    await dbConnect()

    const user = await User.findById(id)

    if (!user) return null

    return {
      ...user.toObject(),
      _id: user._id.toString(),
    } as UserType
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

    await dbConnect()

    await User.findByIdAndUpdate(userId, {
      userType: "business",
      twitterHandle,
      twitterFollowers,
      bio,
    })

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

    await dbConnect()

    // Add target user to current user's following list
    await User.findByIdAndUpdate(userId, { $addToSet: { following: targetUserId } })

    // Add current user to target user's followers list
    await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: userId } })

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
    await dbConnect()

    // Remove target user from current user's following list
    await User.findByIdAndUpdate(userId, { $pull: { following: targetUserId } })

    // Remove current user from target user's followers list
    await User.findByIdAndUpdate(targetUserId, { $pull: { followers: userId } })

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

    await dbConnect()

    await User.findByIdAndUpdate(userId, updateData)

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

    await dbConnect()

    await User.findByIdAndUpdate(userId, {
      notificationSettings: settings,
    })

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

    await dbConnect()

    await User.findByIdAndUpdate(userId, {
      privacySettings: settings,
    })

    revalidatePath(`/settings`)
    revalidatePath(`/profile/${userId}`)
    return true
  } catch (error) {
    console.error("Failed to update privacy settings:", error)
    return false
  }
}
