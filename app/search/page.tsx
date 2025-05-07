import { Suspense } from "react"
import Header from "@/components/header"
import SearchResults from "@/components/search-results"
import Loading from "@/components/loading"
import { searchProjects, searchUsers } from "@/lib/actions/search-actions"
import { Project, User } from "@/lib/types"

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || ""

  let projects: Project[] = []
  let users: User[] = []

  if (query) {
    // Fetch search results
    projects = await searchProjects(query)
    users = await searchUsers(query)
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <Header />
        <div className="py-8">
          <h1 className="text-3xl font-bold mb-6">{query ? `Search results for "${query}"` : "Search"}</h1>

          <Suspense fallback={<Loading />}>
            <SearchResults query={query} projects={projects} users={users} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
