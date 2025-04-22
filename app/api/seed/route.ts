import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongoose/db"
import Project from "@/lib/mongoose/models/project"
import User from "@/lib/mongoose/models/user"

export async function GET() {
  try {
    await dbConnect()

    // Check if projects already exist
    const projectsCount = await Project.countDocuments()

    if (projectsCount > 0) {
      return NextResponse.json({ message: "Database already seeded" })
    }

    // Create a default admin user
    const adminUser = new User({
      privyId: "admin",
      name: "Admin User",
      userType: "business",
      supportedProjects: [],
      createdProjects: [],
      following: [],
      followers: [],
      supportsReceived: 0,
    })

    await adminUser.save()

    // Sample projects data
    const projects = [
      {
        name: "Plant Trees for a Greener Future",
        description: "Help us plant more trees and combat deforestation! 🌱",
        imageUrl: "/images/plant-trees.png",
        price: 0.62,
        percentChange: 4.8,
        category: "activism",
        supportable: true,
        creatorId: adminUser._id,
      },
      {
        name: "Homebrew Café",
        location: "NEW YORK, NY",
        imageUrl: "/images/homebrew-cafe.png",
        price: 0.23,
        percentChange: -2.1,
        category: "arts",
        supportable: false,
        marketCap: 2.38,
        creatorId: adminUser._id,
      },
      {
        name: "Support Open Source Tooling",
        organization: "PixelCraft",
        imageUrl: "/images/open-source.png",
        price: 0.89,
        percentChange: 3.5,
        category: "tech",
        supportable: true,
        creatorId: adminUser._id,
      },
      {
        name: "Film Festival Needs Your Support",
        organization: "Prism Films",
        imageUrl: "/images/film-festival.png",
        price: 1.43,
        percentChange: -1.9,
        category: "arts",
        supportable: true,
        creatorId: adminUser._id,
      },
    ]

    // Insert projects
    await Project.insertMany(projects)

    // Update admin user's created projects
    const createdProjects = await Project.find({ creatorId: adminUser._id })
    const projectIds = createdProjects.map((project) => project._id)

    await User.findByIdAndUpdate(adminUser._id, {
      $set: { createdProjects: projectIds },
    })

    return NextResponse.json({ message: "Database seeded successfully" })
  } catch (error) {
    console.error("Failed to seed database:", error)
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 })
  }
}
