"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { upgradeToBusinessUser } from "@/lib/actions/user-actions"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { Twitter } from "lucide-react"

export default function UpgradeForm({ userId }: { userId: string }) {
  const [twitterHandle, setTwitterHandle] = useState("")
  const [bio, setBio] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const { toast } = useToast()
  const router = useRouter()
  const { linkTwitter, user } = usePrivy()

  const handleTwitterConnect = async () => {
    try {
      await linkTwitter()

      // Check if Twitter was successfully linked
      if (user?.twitter?.username) {
        setTwitterHandle(user.twitter.username)
        setStep(2)
      } else {
        // Wait a moment and check again (Privy might need time to update)
        setTimeout(() => {
          if (user?.twitter?.username) {
            setTwitterHandle(user.twitter.username)
            setStep(2)
          }
        }, 2000)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect Twitter account. Please try again.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    // If user has Twitter connected, pre-fill the handle and move to step 2
    if (user?.twitter?.username && step === 1) {
      setTwitterHandle(user.twitter.username)
      setStep(2)
    }
  }, [user?.twitter?.username, step])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!twitterHandle.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Twitter handle",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // In a real app, you would verify Twitter followers here
      // For this example, we'll simulate a check
      const twitterFollowers = 15000 // Simulated follower count

      if (twitterFollowers < 10000) {
        toast({
          title: "Requirements Not Met",
          description: "You need at least 10,000 Twitter followers to upgrade to a Business account.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      await upgradeToBusinessUser({
        userId,
        twitterHandle,
        twitterFollowers,
        bio,
      })

      toast({
        title: "Success!",
        description: "Your account has been upgraded to Business",
      })

      router.push(`/profile/${userId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upgrade account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-lg shadow-sm border">
      <h1 className="text-3xl font-bold mb-6">Upgrade to Business Account</h1>

      {step === 1 ? (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Requirements</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Connect your Twitter account</li>
              <li>Have at least 10,000 Twitter followers</li>
              <li>Complete your profile information</li>
            </ul>
          </div>

          <div className="text-center">
            <Button onClick={handleTwitterConnect} className="bg-[#1DA1F2] hover:bg-[#1a94e0] text-white py-6 px-8">
              <Twitter className="mr-2 h-5 w-5" />
              Connect Twitter Account
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="twitterHandle">Twitter Handle</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                @
              </span>
              <Input
                id="twitterHandle"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                className="rounded-l-none"
                placeholder="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself or your organization"
              className="min-h-[100px]"
            />
          </div>

          <Button type="submit" className="w-full py-6 bg-black text-white hover:bg-gray-800" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Complete Upgrade"}
          </Button>
        </form>
      )}
    </div>
  )
}
