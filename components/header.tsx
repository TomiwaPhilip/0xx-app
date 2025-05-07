"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePrivy } from "@privy-io/react-auth"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Header() {
  const { login, authenticated, user, logout } = usePrivy()
  const { toast } = useToast()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleConnectWallet = () => {
    if (!authenticated) {
      login()
    } else {
      toast({
        title: "Already connected",
        description: `Connected as ${user?.email || user?.wallet?.address}`,
      })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="py-4 flex justify-between items-center border-b border-gray-100">
      <Link href="/" className="text-3xl font-bold">
        0XX
      </Link>

      <div className="flex-1 max-w-md mx-4">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search projects or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-4 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black"
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/create" className="text-lg">
          Create
        </Link>

        {authenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-10 w-10 cursor-pointer">
                <AvatarImage src={user?.twitter?.profilePictureUrl || "/images/default-avatar.png"} alt={user?.twitter?.name || "User"} />
                <AvatarFallback>{user?.twitter?.name?.charAt(0) || user?.email?.address?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href={`/profile/${user?.id}`} className="cursor-pointer">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-red-500 cursor-pointer">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={handleConnectWallet} className="bg-black text-white hover:bg-gray-800 rounded-md">
            Connect Wallet
          </Button>
        )}
      </div>
    </header>
  )
}
