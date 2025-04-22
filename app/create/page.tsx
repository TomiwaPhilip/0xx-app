import { Suspense } from "react"
import { redirect } from "next/navigation"
import DetailHeader from "@/components/detail-header"
import Loading from "@/components/loading"
import { getUser } from "@/lib/actions/user-actions"
import PrivyWalletWrapper from "@/components/privy-wallet-wrapper"

export default async function CreatePage() {
  const user = await getUser()

  // Redirect if not logged in or not a business user
  if (!user) {
    redirect("/")
  }

  if (user.userType !== "business") {
    redirect("/profile/upgrade")
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <DetailHeader title="Create Post" />
        <Suspense fallback={<Loading />}>
          <PrivyWalletWrapper userId={user._id} />
        </Suspense>
      </div>
    </main>
  )
}
