"use server"

import dbConnect from "@/lib/mongoose/db"
import Project from "@/lib/mongoose/models/project"
import User from "@/lib/mongoose/models/user"
import Transaction from "@/lib/mongoose/models/transaction"
import { getUser } from "./user-actions"
import { revalidatePath } from "next/cache"
import mongoose from "mongoose"
import type { Project as ProjectType } from "@/lib/types"
import { serializeDocument } from "@/lib/mongoose/utils"
import { createContentToken, getContentTokenDetails } from "@/lib/content"
import type { ContentTokenInfo } from "@/lib/content"
import { createCollection, getCollectionMetadata } from "@/lib/services/collection-service"
import { buyTokens } from "@/lib/services/trading-service"
import { updateProjectMarketData } from "@/lib/services/market-service"
import { getPrivyUserFromCookie } from "@/lib/privy-server"

export async function getProjects(): Promise<ProjectType[]> {
  try {
    await dbConnect()
    const projects = await Project.find().sort({ createdAt: -1 })
    
    // Update market data for all projects with tokens
    await Promise.all(
      projects.map(async (project) => {
        await updateProjectMarketData(project)
      })
    )
    
    return serializeDocument<ProjectType[]>(projects)
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

    // Update market data if project has a token
    await updateProjectMarketData(project)
    
    return serializeDocument<ProjectType>(project)
  } catch (error) {
    console.error("Failed to fetch project:", error)
    return null
  }
}

export async function getProjectsByCreator(creatorId: string): Promise<ProjectType[]> {
  try {
    await dbConnect()
    const projects = await Project.find({ creatorId }).sort({ createdAt: -1 })
    return serializeDocument<ProjectType[]>(projects)
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
    return serializeDocument<ProjectType[]>(projects)
  } catch (error) {
    console.error("Failed to fetch supported projects:", error)
    return []
  }
}

export async function supportProject(projectId: string): Promise<boolean> {
  try {
    const user = await getUser()
    if (!user) throw new Error("User not authenticated")
    if (!user.walletAddress) throw new Error("Wallet address required to support projects")

    await dbConnect()

    // Get the project
    const project = await Project.findById(projectId)
    if (!project) throw new Error("Project not found")
    if (!project.tokenAddress) throw new Error("Project has no token")

    // Calculate token amount to buy (for now, fixed amount)
    const amount = BigInt(1e18) // 1 token
    const minReceived = BigInt(0) // Accept any amount for now

    try {
      // Buy tokens using trading service
      const result = await buyTokens({
        tokenAddress: project.tokenAddress,
        amount,
        minReceived,
        account: user.walletAddress as `0x${string}`,
      })

      if (!result.hash) {
        throw new Error("Transaction failed")
      }

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
        tokenAmount: amount.toString(),
        transactionHash: result.hash,
      })

      await transaction.save()

      revalidatePath("/")
      revalidatePath(`/projects/${projectId}`)
      revalidatePath(`/profile/${project.creatorId}`)
      return true
    } catch (error) {
      console.error("Error buying tokens:", error)
      throw error
    }
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
  initialSupply?: string
  contentURI?: string
}): Promise<string | null> {
  try {
    const user = await getUser()
    if (!user) throw new Error("User not authenticated")
    if (user.userType !== "business") throw new Error("Only business users can create projects")

    // Get Privy user to ensure we have the latest wallet address
    const privyUser = await getPrivyUserFromCookie()
    if (!privyUser?.wallet?.address) throw new Error("Wallet address required to create a collection")

    await dbConnect()

    // Create content token if initialSupply is specified
    let tokenAddress: string | undefined
    let tokenSymbol: string | undefined

    if (projectData.initialSupply) {
      try {
        const symbol = projectData.name.replace(/[^A-Z0-9]/gi, "").substring(0, 5).toUpperCase()
        
        // Create the collection using collection service
        tokenAddress = await createCollection({
          name: projectData.name,
          symbol,
          contentURI: projectData.contentURI || projectData.imageUrl,
          initialSupply: BigInt(projectData.initialSupply),
          creatorAddress: privyUser.wallet.address as `0x${string}`
        })

        if (!tokenAddress) {
          throw new Error("Failed to create content token")
        }

        tokenSymbol = symbol
      } catch (error) {
        console.error("Error creating content token:", error)
        throw new Error("Failed to create content token")
      }
    }

    const newProject = new Project({
      ...projectData,
      supportable: true,
      comments: [],
      // Add token information if created
      tokenAddress,
      tokenSymbol,
      initialSupply: projectData.initialSupply,
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

export async function getProjectWithTokenDetails(id: string): Promise<ProjectType | null> {
  try {
    await dbConnect()
    const project = await Project.findById(id)
    if (!project) return null

    // If project has a token, get its metadata
    if (project.tokenAddress) {
      try {
        const tokenInfo = await getCollectionMetadata(project.tokenAddress)
        project.currentSupply = tokenInfo.totalSupply.toString()
        project.tokenPrice = tokenInfo.price?.toString() || "0"
      } catch (error) {
        console.error("Error fetching token details:", error)
      }
    }

    return serializeDocument<ProjectType>(project)
  } catch (error) {
    console.error("Failed to fetch project:", error)
    return null
  }
}
