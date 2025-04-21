"use client"

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Project } from "@/lib/types"
import { usePrivy } from "@privy-io/react-auth"
import { supportProject } from "@/lib/actions/project-actions"
import { useToast } from "@/components/ui/use-toast"

export default function ProjectCard({ project }: { project: Project }) {
  const { login, authenticated } = usePrivy()
  const { toast } = useToast()

  const handleSupport = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!authenticated) {
      login()
      return
    }

    try {
      await supportProject(project._id)
      toast({
        title: "Success!",
        description: `You've supported ${project.name}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to support project. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Link href={`/projects/${project._id}`} className="block">
      <div className="flex items-center justify-between p-4 border-t border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden">
            <Image src={project.imageUrl || "/placeholder.svg"} alt={project.name} fill className="object-cover" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">{project.name}</h3>
            {project.description && <p className="text-gray-600 line-clamp-1">{project.description}</p>}
            {project.location && <p className="text-gray-600">{project.location}</p>}
            {project.organization && <p className="text-gray-600">{project.organization}</p>}
            {project.marketCap && (
              <p className="text-gray-600">
                $ {project.marketCap.toFixed(3)} <span className="ml-4">Market cap</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold">${project.price.toFixed(2)}</span>
            <span className={`${project.percentChange >= 0 ? "text-green-500" : "text-red-500"}`}>
              {project.percentChange >= 0 ? "+" : ""}
              {project.percentChange}%
            </span>
          </div>
          {project.supportable && (
            <Button onClick={handleSupport} className="bg-black text-white hover:bg-gray-800 rounded-md">
              Support (Buy)
            </Button>
          )}
        </div>
      </div>
    </Link>
  )
}
