"use server"

import clientPromise from "@/lib/mongodb"
import type { Project, User } from "@/lib/types"

export async function searchProjects(query: string): Promise<Project[]> {
  try {
    const client = await clientPromise
    const db = client.db("0xx")

    // Create a text index if it doesn't exist
    try {
      await db.collection("projects").createIndex({ name: "text", description: "text", category: "text" })
    } catch (error) {
      // Index might already exist, continue
    }

    // Search using text index
    const projects = await db
      .collection("projects")
      .find({
        $or: [
          { $text: { $search: query } },
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    return projects.map((project) => ({
      ...project,
      _id: project._id.toString(),
    })) as Project[]
  } catch (error) {
    console.error("Failed to search projects:", error)
    return []
  }
}

export async function searchUsers(query: string): Promise<User[]> {
  try {
    const client = await clientPromise
    const db = client.db("0xx")

    // Create a text index if it doesn't exist
    try {
      await db.collection("users").createIndex({ name: "text", email: "text", twitterHandle: "text", bio: "text" })
    } catch (error) {
      // Index might already exist, continue
    }

    // Search using text index and regex for partial matches
    const users = await db
      .collection("users")
      .find({
        $or: [
          { $text: { $search: query } },
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { twitterHandle: { $regex: query, $options: "i" } },
          { bio: { $regex: query, $options: "i" } },
        ],
      })
      .sort({ supportsReceived: -1 })
      .limit(20)
      .toArray()

    return users.map((user) => ({
      ...user,
      _id: user._id.toString(),
    })) as User[]
  } catch (error) {
    console.error("Failed to search users:", error)
    return []
  }
}
