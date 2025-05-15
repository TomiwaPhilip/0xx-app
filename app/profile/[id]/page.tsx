import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getUser} from "@/lib/actions/user-actions"
import { getProjectsByCreator, getSupportedProjects } from "@/lib/actions/project-actions"
import ProfileHeader from "@/components/profile-header"
import ProfileTabs from "@/components/profile-tabs"
import Loading from "@/components/loading"

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const user = await getUser()

  if (!user) {
    notFound()
  }

  const createdProjects = user.userType === "business" ? await getProjectsByCreator(user._id) : []
  const supportedProjects = await getSupportedProjects(user._id)

  return (
    <main className="min-h-screen bg-white">
      <Suspense fallback={<Loading />}>
        <ProfileHeader user={user} />
        <div className="container mx-auto px-4 max-w-6xl">
          <ProfileTabs user={user} createdProjects={createdProjects} supportedProjects={supportedProjects} />
        </div>
      </Suspense>
    </main>
  )
}
