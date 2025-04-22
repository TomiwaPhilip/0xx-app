"use client"

import { usePrivy } from "@privy-io/react-auth"
import CreatePostForm from "@/components/create-post-form"

export default function PrivyWalletWrapper({ userId }: { userId: string }) {
  const { user, linkWallet } = usePrivy()

  return <CreatePostForm userId={userId} user={user} linkWallet={linkWallet} />
}
