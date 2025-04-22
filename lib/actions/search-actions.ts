"use server"

import dbConnect from "@/lib/mongoose/db"
import Project from "@/lib/mongoose/models/project"
import User from "@/lib/mongoose/models/user"
import type { Project as ProjectType, User as UserType } from "@/lib/types"

export async function searchProjects(query: string): Promise<ProjectType[]> {
  try {
    await dbConnect()

    // Create a text index if it doesn't exist
    try {
      await Project.collection.createIndex({ name: "text", description: "text", category: "text" })
    } catch (error) {
      // Index might already exist, continue
    }

    // Search using text index and regex for partial matches
    const projects = await Project.find({
      $or: [
        { $text: { $search: query } },
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)

    return projects.map((project) => ({
      ...project.toObject(),
      _id: project._id.toString(),
    })) as ProjectType[]
  } catch (error) {
    console.error("Failed to search projects:", error)
    return []
  }
}

export async function searchUsers(query: string): Promise<UserType[]> {
  try {
    await dbConnect()

    // Create a text index if it doesn't exist
    try {
      await User.collection.createIndex({ name: "text", email: "text", twitterHandle: "text", bio: "text" })
    } catch (error) {
      // Index might already exist, continue
    }

    // Search using text index and regex for partial matches
    const users = await User.find({
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

    return users.map((user) => ({
      ...user.toObject(),
      _id: user._id.toString(),
    })) as UserType[]
  } catch (error) {
    console.error("Failed to search users:", error)
    return []
  }
}
