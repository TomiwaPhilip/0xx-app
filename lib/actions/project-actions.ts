"use server"

import clientPromise from "@/lib/mongodb"
import type { Project } from "@/lib/types"
import { getUser } from "./user-actions"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"

export async function getProjects(): Promise<Project[]> {
  try {
    const client = await clientPromise
    const db = client.db("0xx")

    const projects = await db.collection("projects").find({}).sort({ createdAt: -1 }).toArray()

    return projects.map((project) => ({
      ...project,
      _id: project._id.toString(),
    })) as Project[]
  } catch (error) {
    console.error("Failed to fetch projects:", error)
    return []
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const client = await clientPromise
    const db = client.db("0xx")

    const project = await db.collection("projects").findOne({ _id: new ObjectId(id) })

    if (!project) return null

    return {
      ...project,
      _id: project._id.toString(),
    } as Project
  } catch (error) {
    console.error("Failed to fetch project:", error)
    return null
  }
}

export async function getProjectsByCreator(creatorId: string): Promise<Project[]> {
  try {
    const client = await clientPromise
    const db = client.db("0xx")

    const projects = await db.collection("projects").find({ creatorId }).sort({ createdAt: -1 }).toArray()

    return projects.map((project) => ({
      ...project,
      _id: project._id.toString(),
    })) as Project[]
  } catch (error) {
    console.error("Failed to fetch creator projects:", error)
    return []
  }
}

export async function getSupportedProjects(userId: string): Promise<Project[]> {
  try {
    const client = await clientPromise
    const db = client.db("0xx")

    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) })
    if (!user || !user.supportedProjects || user.supportedProjects.length === 0) {
      return []
    }

    const projectIds = user.supportedProjects.map((id: string) => new ObjectId(id))
    const projects = await db
      .collection("projects")
      .find({ _id: { $in: projectIds } })
      .sort({ createdAt: -1 })
      .toArray()

    return projects.map((project) => ({
      ...project,
      _id: project._id.toString(),
    })) as Project[]
  } catch (error) {
    console.error("Failed to fetch supported projects:", error)
    return []
  }
}

export async function supportProject(projectId: string): Promise<boolean> {
  try {
    const user = await getUser()
    if (!user) throw new Error("User not authenticated")

    const client = await clientPromise
    const db = client.db("0xx")

    // Get the project
    const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId) })
    if (!project) throw new Error("Project not found")

    // Update user's supported projects
    await db
      .collection("users")
      .updateOne({ _id: new ObjectId(user._id) }, { $addToSet: { supportedProjects: projectId } })

    // Update project creator's supports received count
    await db.collection("users").updateOne({ _id: new ObjectId(project.creatorId) }, { $inc: { supportsReceived: 1 } })

    // Add transaction record
    await db.collection("transactions").insertOne({
      projectId,
      userId: user._id,
      userName: user.name || "Anonymous",
      action: "bought",
      price: project.price,
      createdAt: new Date(),
    })

    revalidatePath("/")
    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/profile/${project.creatorId}`)
    return true
  } catch (error) {
    console.error("Failed to support project:", error)
    return false
  }
}

export async function addComment(projectId: string, commentText: string): Promise<boolean> {
  try {
    const user = await getUser()
    if (!user) throw new Error("User not authenticated")

    const client = await clientPromise
    const db = client.db("0xx")

    const comment = {
      _id: new ObjectId().toString(),
      userId: user._id,
      userName: user.name || "Anonymous",
      userImage: user.profileImage,
      text: commentText,
      createdAt: new Date(),
    }

    await db.collection("projects").updateOne({ _id: new ObjectId(projectId) }, { $push: { comments: comment as any } })

    revalidatePath(`/projects/${projectId}`)
    return true
  } catch (error) {
    console.error("Failed to add comment:", error)
    return false
  }
}

export async function createProject(projectData: {
  name: string
  description?: string
  imageUrl: string
  price?: number
  percentChange: number
  category: string
  creatorId: string
}): Promise<string | null> {
  try {
    const user = await getUser()
    if (!user) throw new Error("User not authenticated")
    if (user.userType !== "business") throw new Error("Only business users can create projects")

    const client = await clientPromise
    const db = client.db("0xx")

    const newProject = {
      ...projectData,
      supportable: true,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("projects").insertOne(newProject)
    const projectId = result.insertedId.toString()

    // Update user's created projects
    await db
      .collection("users")
      .updateOne({ _id: new ObjectId(user._id) }, { $addToSet: { createdProjects: projectId } })

    revalidatePath("/")
    revalidatePath(`/profile/${user._id}`)
    return projectId
  } catch (error) {
    console.error("Failed to create project:", error)
    return null
  }
}
