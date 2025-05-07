"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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

export default function DetailHeader({ title }: { title: string }) {
  const { login, authenticated, user, logout } = usePrivy()
  const { toast } = useToast()

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

  return (
    <header className="py-4 flex justify-between items-center border-b border-gray-100">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-2xl">
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

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
    </header>
  )
}
