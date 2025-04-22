"use server"

import dbConnect from "@/lib/mongoose/db"
import Project from "@/lib/mongoose/models/project"
import User from "@/lib/mongoose/models/user"
import Transaction from "@/lib/mongoose/models/transaction"
import { getUser } from "./user-actions"
import { revalidatePath } from "next/cache"
import mongoose from "mongoose"
import type { Project as ProjectType } from "@/lib/types"

export async function getProjects(): Promise<ProjectType[]> {
  try {
    await dbConnect()

    const projects = await Project.find().sort({ createdAt: -1 })

    return projects.map((project) => ({
      ...project.toObject(),
      _id: project._id.toString(),
    })) as ProjectType[]
  } catch (error) {
    console.error("Failed to fetch projects:", error)
    return []
  }
}

export async function getProjectById(id: string): Promise<ProjectType | null> {
  try {
    await dbConnect()

    const project = await Project.findById(id)

    if (!project) return null

    return {
      ...project.toObject(),
      _id: project._id.toString(),
    } as ProjectType
  } catch (error) {
    console.error("Failed to fetch project:", error)
    return null
  }
}

export async function getProjectsByCreator(creatorId: string): Promise<ProjectType[]> {
  try {
    await dbConnect()

    const projects = await Project.find({ creatorId }).sort({ createdAt: -1 })

    return projects.map((project) => ({
      ...project.toObject(),
      _id: project._id.toString(),
    })) as ProjectType[]
  } catch (error) {
    console.error("Failed to fetch creator projects:", error)
    return []
  }
}

export async function getSupportedProjects(userId: string): Promise<ProjectType[]> {
  try {
    await dbConnect()

    const user = await User.findById(userId)
    if (!user || !user.supportedProjects || user.supportedProjects.length === 0) {
      return []
    }

    const projects = await Project.find({
      _id: { $in: user.supportedProjects },
    }).sort({ createdAt: -1 })

    return projects.map((project) => ({
      ...project.toObject(),
      _id: project._id.toString(),
    })) as ProjectType[]
  } catch (error) {
    console.error("Failed to fetch supported projects:", error)
    return []
  }
}

export async function supportProject(projectId: string): Promise<boolean> {
  try {
    const user = await getUser()
    if (!user) throw new Error("User not authenticated")

    await dbConnect()

    // Get the project
    const project = await Project.findById(projectId)
    if (!project) throw new Error("Project not found")

    // Update user's supported projects
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { supportedProjects: projectId },
    })

    // Update project creator's supports received count
    await User.findByIdAndUpdate(project.creatorId, {
      $inc: { supportsReceived: 1 },
    })

    // Add transaction record
    const transaction = new Transaction({
      projectId,
      userId: user._id,
      userName: user.name || "Anonymous",
      action: "bought",
      price: project.price,
    })

    await transaction.save()

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

    await dbConnect()

    const comment = {
      _id: new mongoose.Types.ObjectId().toString(),
      userId: user._id,
      userName: user.name || "Anonymous",
      userImage: user.profileImage,
      text: commentText,
      createdAt: new Date(),
    }

    await Project.findByIdAndUpdate(projectId, {
      $push: { comments: comment },
    })

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

    await dbConnect()

    const newProject = new Project({
      ...projectData,
      supportable: true,
      comments: [],
    })

    const savedProject = await newProject.save()
    const projectId = savedProject._id.toString()

    // Update user's created projects
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { createdProjects: projectId },
    })

    revalidatePath("/")
    revalidatePath(`/profile/${user._id}`)
    return projectId
  } catch (error) {
    console.error("Failed to create project:", error)
    return null
  }
}
