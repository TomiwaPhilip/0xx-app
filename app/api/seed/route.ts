import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("zora")

    // Check if projects already exist
    const projectsCount = await db.collection("projects").countDocuments()

    if (projectsCount > 0) {
      return NextResponse.json({ message: "Database already seeded" })
    }

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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Support Open Source Tooling",
        organization: "PixelCraft",
        imageUrl: "/images/open-source.png",
        price: 0.89,
        percentChange: 3.5,
        category: "tech",
        supportable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Film Festival Needs Your Support",
        organization: "Prism Films",
        imageUrl: "/images/film-festival.png",
        price: 1.43,
        percentChange: -1.9,
        category: "arts",
        supportable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    await db.collection("projects").insertMany(projects)

    return NextResponse.json({ message: "Database seeded successfully" })
  } catch (error) {
    console.error("Failed to seed database:", error)
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 })
  }
}
