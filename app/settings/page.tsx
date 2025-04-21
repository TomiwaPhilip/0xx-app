import { Suspense } from "react"
import { redirect } from "next/navigation"
import DetailHeader from "@/components/detail-header"
import SettingsForm from "@/components/settings-form"
import Loading from "@/components/loading"
import { getUser } from "@/lib/actions/user-actions"

export default async function SettingsPage() {
  const user = await getUser()

  // Redirect if not logged in
  if (!user) {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <DetailHeader title="Settings" />
        <Suspense fallback={<Loading />}>
          <SettingsForm user={user} />
        </Suspense>
      </div>
    </main>
  )
}
