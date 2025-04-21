import { Suspense } from "react"
import { redirect } from "next/navigation"
import DetailHeader from "@/components/detail-header"
import UpgradeForm from "@/components/upgrade-form"
import Loading from "@/components/loading"
import { getUser } from "@/lib/actions/user-actions"

export default async function UpgradePage() {
  const user = await getUser()

  // Redirect if not logged in
  if (!user) {
    redirect("/")
  }

  // If already a business user, redirect to profile
  if (user.userType === "business") {
    redirect(`/profile/${user._id}`)
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <DetailHeader title="Upgrade to Business Account" />
        <Suspense fallback={<Loading />}>
          <UpgradeForm userId={user._id} />
        </Suspense>
      </div>
    </main>
  )
}
