"use client"

import { useState } from "react"
import type { Project } from "@/lib/types"
import ProjectCard from "@/components/project-card"

type Category = "all" | "arts" | "activism" | "music" | "tech"

export default function TrendingSection({ projects }: { projects: Project[] }) {
  const [activeCategory, setActiveCategory] = useState<Category>("all")

  const filteredProjects =
    activeCategory === "all" ? projects : projects.filter((project) => project.category === activeCategory)

  return (
    <section className="py-8">
      <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-8 mb-6">
        <h2 className="text-5xl font-bold">Trending</h2>
        <div className="flex flex-wrap gap-4 md:gap-6">
          <button
            onClick={() => setActiveCategory("all")}
            className={`text-xl ${activeCategory === "all" ? "text-black font-semibold" : "text-gray-500"}`}
          >
            all
          </button>
          {["arts", "activism", "music", "tech"].map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category as Category)}
              className={`text-xl ${activeCategory === category ? "text-black font-semibold" : "text-gray-500"}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => <ProjectCard key={project._id} project={project} />)
        ) : (
          <p className="text-gray-500 py-4">No projects found in this category.</p>
        )}
      </div>
    </section>
  )
}
