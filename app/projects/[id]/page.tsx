import { Suspense } from "react"
import { getProjectById } from "@/lib/actions/project-actions"
import { notFound } from "next/navigation"
import DetailHeader from "@/components/detail-header"
import ProjectDetail from "@/components/project-detail"
import Loading from "@/components/loading"

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProjectById(params.id)

  if (!project) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <DetailHeader title="Post Detail" />
        <Suspense fallback={<Loading />}>
          <ProjectDetail project={project} />
        </Suspense>
      </div>
    </main>
  )
}
