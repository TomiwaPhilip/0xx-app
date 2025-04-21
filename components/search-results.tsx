"use client"

import { useState } from "react"
import type { Project, User } from "@/lib/types"
import ProjectCard from "@/components/project-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

export default function SearchResults({
  query,
  projects,
  users,
}: {
  query: string
  projects: Project[]
  users: User[]
}) {
  const [activeTab, setActiveTab] = useState("all")

  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Enter a search term to find projects and users.</p>
      </div>
    )
  }

  if (projects.length === 0 && users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No results found for "{query}".</p>
      </div>
    )
  }

  return (
    <div>
      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All ({projects.length + users.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {users.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Users</h2>
              <div className="space-y-4">
                {users.slice(0, 3).map((user) => (
                  <UserResult key={user._id} user={user} />
                ))}
                {users.length > 3 && (
                  <button onClick={() => setActiveTab("users")} className="text-sm text-gray-500 hover:text-black">
                    View all {users.length} users
                  </button>
                )}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Projects</h2>
              <div className="space-y-4">
                {projects.map((project) => (
                  <ProjectCard key={project._id} project={project} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects">
          {projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No projects found for "{query}".</p>
          )}
        </TabsContent>

        <TabsContent value="users">
          {users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user) => (
                <UserResult key={user._id} user={user} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No users found for "{query}".</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UserResult({ user }: { user: User }) {
  return (
    <Link href={`/profile/${user._id}`}>
      <div className="flex items-center gap-4 p-4 border-t border-gray-100 hover:bg-gray-50 transition-colors">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.profileImage || "/images/default-avatar.png"} alt={user.name || "User"} />
          <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{user.name || "Anonymous User"}</h3>
          <p className="text-sm text-gray-500">
            {user.userType === "business" ? "Business/Creator" : "User"} •{user.supportsReceived} supports received
          </p>
        </div>
      </div>
    </Link>
  )
}
