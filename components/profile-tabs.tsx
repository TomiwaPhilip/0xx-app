"use client"

import { useState } from "react"
import type { User, Project } from "@/lib/types"
import ProjectCard from "@/components/project-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProfileTabs({
  user,
  createdProjects,
  supportedProjects,
}: {
  user: User
  createdProjects: Project[]
  supportedProjects: Project[]
}) {
  const [activeTab, setActiveTab] = useState("posts")

  return (
    <div className="py-4">
      <Tabs defaultValue="posts" onValueChange={setActiveTab}>
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0">
          <TabsTrigger
            value="posts"
            className={`rounded-none border-b-2 px-4 py-2 font-semibold ${
              activeTab === "posts" ? "border-black text-black" : "border-transparent text-gray-500"
            }`}
          >
            Posts
          </TabsTrigger>

          <TabsTrigger
            value="about"
            className={`rounded-none border-b-2 px-4 py-2 font-semibold ${
              activeTab === "about" ? "border-black text-black" : "border-transparent text-gray-500"
            }`}
          >
            About
          </TabsTrigger>

          {user.userType === "business" && (
            <TabsTrigger
              value="creations"
              className={`rounded-none border-b-2 px-4 py-2 font-semibold ${
                activeTab === "creations" ? "border-black text-black" : "border-transparent text-gray-500"
              }`}
            >
              Creations
            </TabsTrigger>
          )}

          <TabsTrigger
            value="collections"
            className={`rounded-none border-b-2 px-4 py-2 font-semibold ${
              activeTab === "collections" ? "border-black text-black" : "border-transparent text-gray-500"
            }`}
          >
            Collections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            {user.userType === "business" ? (
              createdProjects.length > 0 ? (
                createdProjects.map((project) => <ProjectCard key={project._id} project={project} />)
              ) : (
                <p className="text-gray-500">No posts yet.</p>
              )
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold mb-2">Upgrade to Business Account</h3>
                <p className="text-gray-600 mb-4">Create your own posts and receive support from the community.</p>
                <a
                  href="/profile/upgrade"
                  className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800"
                >
                  Upgrade Now
                </a>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">About</h3>
            <p className="text-gray-700">{user.bio || "No bio available."}</p>

            {user.twitterHandle && (
              <div className="mt-4">
                <h4 className="font-semibold">Twitter</h4>
                <a
                  href={`https://twitter.com/${user.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  @{user.twitterHandle}
                </a>
                {user.twitterFollowers && (
                  <span className="text-gray-500 ml-2">({(user.twitterFollowers / 1000).toFixed(1)}K followers)</span>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {user.userType === "business" && (
          <TabsContent value="creations" className="mt-6">
            <div className="grid grid-cols-1 gap-6">
              {createdProjects.length > 0 ? (
                createdProjects.map((project) => <ProjectCard key={project._id} project={project} />)
              ) : (
                <p className="text-gray-500">No creations yet.</p>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="collections" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            {supportedProjects.length > 0 ? (
              supportedProjects.map((project) => <ProjectCard key={project._id} project={project} />)
            ) : (
              <p className="text-gray-500">No collections yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
