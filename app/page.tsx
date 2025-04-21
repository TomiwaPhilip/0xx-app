import Header from "@/components/header"
import TrendingSection from "@/components/trending-section"
import { getProjects } from "@/lib/actions/project-actions"

export default async function Home() {
  const projects = await getProjects()

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <Header />
        <TrendingSection projects={projects} />
      </div>
    </main>
  )
}
