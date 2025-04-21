"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Project } from "@/lib/types"
import { usePrivy } from "@privy-io/react-auth"
import { useToast } from "@/components/ui/use-toast"
import { supportProject, addComment } from "@/lib/actions/project-actions"
import PriceChart from "@/components/price-chart"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"

// Mock data for display purposes
const supporters = [
  { id: "1", name: "Jacob", image: "/images/avatar-1.png" },
  { id: "2", name: "Emma", image: "/images/avatar-2.png" },
  { id: "3", name: "Sophia", image: "/images/avatar-3.png" },
  { id: "4", name: "Olivia", image: "/images/avatar-4.png" },
  { id: "5", name: "James", image: "/images/avatar-5.png" },
]

const comments = [
  { id: "1", user: { name: "Adam", image: "/images/avatar-6.png" }, text: "Great initiative!" },
  { id: "2", user: { name: "Emily", image: "/images/avatar-2.png" }, text: "I'm happy to support this!" },
  {
    id: "3",
    user: { name: "Michael", image: "/images/avatar-7.png" },
    text: "Looking forward to seeing the progress.",
  },
]

const history = [
  { id: "1", user: "Alice", action: "bought", price: 4.92, time: "2023-05-01T12:00:00Z" },
  { id: "2", user: "Emily", action: "sold", price: 4.95, time: "2023-05-01T10:30:00Z" },
  { id: "3", user: "David", action: "bought", price: 4.86, time: "2023-05-01T09:15:00Z" },
]

export default function ProjectDetail({ project }: { project: Project }) {
  const [newComment, setNewComment] = useState("")
  const { login, authenticated } = usePrivy()
  const { toast } = useToast()

  const handleSupport = async () => {
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authenticated) {
      login()
      return
    }

    if (!newComment.trim()) return

    try {
      await addComment(project._id, newComment)
      setNewComment("")
      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h1 className="text-4xl font-bold mb-4">{project.name}</h1>

          {/* Post content - added text content display */}
          {project.description && (
            <div className="mb-6 text-lg">
              <p>{project.description}</p>
            </div>
          )}

          {/* Post image - added proper image display */}
          {project.imageUrl && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <div className="relative w-full h-[300px] md:h-[400px]">
                <Image
                  src={project.imageUrl || "/placeholder.svg"}
                  alt={project.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          )}

          <div className="border rounded-lg p-6 mb-8">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-4xl font-bold">${project.price.toFixed(2)}</div>
                <div className={project.percentChange >= 0 ? "text-green-500" : "text-red-500"}>
                  {project.percentChange >= 0 ? "+" : ""}
                  {project.percentChange}%
                </div>
              </div>
              <div className="text-gray-500">Market cap</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-xl font-bold mb-2">24H</div>
            <PriceChart />
            <div className="flex gap-6 justify-start mt-4">
              <button className="text-gray-600">1H</button>
              <button className="font-bold">24H</button>
              <button className="text-gray-600">7D</button>
              <button className="text-gray-600">1M</button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Comments</h2>
            <div className="space-y-4 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.user.image || "/placeholder.svg"} alt={comment.user.name} />
                    <AvatarFallback>{comment.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold">{comment.user.name}</div>
                    <div>{comment.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="mt-4">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full mb-2"
              />
            </form>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">History</h2>
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="flex justify-between py-2">
                  <div>
                    <span className="font-bold">{item.user}</span>{" "}
                    <span className={item.action === "sold" ? "text-red-500" : "text-green-500"}>{item.action}</span>
                  </div>
                  <div className="font-bold">${item.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSupport}
              className="bg-black text-white hover:bg-gray-800 rounded-md w-full py-6 text-lg"
            >
              Support (Buy)
            </Button>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Supporters</h2>
            <div className="space-y-3">
              {supporters.map((supporter) => (
                <div key={supporter.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={supporter.image || "/placeholder.svg"} alt={supporter.name} />
                    <AvatarFallback>{supporter.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="font-bold">{supporter.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Comments</h2>
            <div className="space-y-3">
              {supporters.slice(0, 4).map((supporter) => (
                <div key={supporter.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={supporter.image || "/placeholder.svg"} alt={supporter.name} />
                    <AvatarFallback>{supporter.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="font-bold">{supporter.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
