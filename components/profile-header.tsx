import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { User } from "@/lib/types"

export default function ProfileHeader({ user }: { user: User }) {
  return (
    <div className="w-full">
      {/* Cover Image */}
      <div className="relative w-full h-48 md:h-64 bg-gray-200">
        {user.coverImage ? (
          <Image src={user.coverImage || "/placeholder.svg"} alt="Cover" fill className="object-cover" />
        ) : (
          <Image src="/images/default-cover.png" alt="Default Cover" fill className="object-cover" />
        )}
      </div>

      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header with navigation */}
        <div className="flex justify-between items-center py-4 border-b border-gray-100">
          <Link href="/" className="text-2xl font-bold">
            0XX
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/explore" className="text-lg">
              Explore
            </Link>
            <Link href="/stats" className="text-lg">
              Stats
            </Link>
            <Button className="bg-black text-white hover:bg-gray-800 rounded-md">connect wallet</Button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="relative flex flex-col items-center -mt-16 mb-6">
          {/* Profile Image */}
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white bg-gray-200">
            {user.profileImage ? (
              <Image
                src={user.profileImage || "/placeholder.svg"}
                alt={user.name || "User"}
                fill
                className="object-cover"
              />
            ) : (
              <Image src="/images/default-avatar.png" alt="Default Avatar" fill className="object-cover" />
            )}
          </div>

          {/* Profile Name and Stats */}
          <h1 className="text-3xl font-bold mt-4">{user.name || "Placeholder Org"}</h1>
          <p className="text-gray-600 mb-4">{user.supportsReceived.toLocaleString()} supports received</p>

          <div className="flex gap-8 text-center">
            <div>
              <span className="font-bold">{user.following.length}</span> Following
            </div>
            <div>
              <span className="font-bold">{(user.followers.length / 1000).toFixed(1)}K</span> Followers
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
