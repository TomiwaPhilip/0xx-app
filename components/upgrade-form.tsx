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
import { X } from "lucide-react"
import { verifyTwitterFollowers } from "@/lib/actions/twitter-actions"

export default function UpgradeForm({ userId }: { userId: string }) {
  const [twitterHandle, setTwitterHandle] = useState("")
  const [bio, setBio] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [step, setStep] = useState(1)
  const { toast } = useToast()
  const router = useRouter()
  const { linkTwitter, user } = usePrivy()

  const handleTwitterConnect = async () => {
    try {
      setIsVerifying(true)
      linkTwitter()

      // Wait for Twitter connection to be established
      const checkTwitterConnection = async () => {
        if (user?.twitter?.username) {
          const followerCount = await verifyTwitterFollowers(user.twitter.username)
          
          if (followerCount >= 10000) {
            setTwitterHandle(user.twitter.username)
            setStep(2)
            toast({
              title: "Success",
              description: "X account connected successfully!",
            })
          } else {
            toast({
              title: "Requirements Not Met",
              description: `You need at least 10,000 followers to upgrade. Current count: ${followerCount.toLocaleString()}`,
              variant: "destructive",
            })
          }
        } else {
          // Retry after a short delay
          setTimeout(checkTwitterConnection, 1000)
        }
      }

      await checkTwitterConnection()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect X account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    // If user has Twitter connected, verify followers and pre-fill the handle
    const verifyExistingTwitter = async () => {
      console.log("user:", user)
      if (user?.twitter?.username && step === 1) {
        const followerCount = await verifyTwitterFollowers(user.twitter.username)
        if (followerCount >= 0) {
          setTwitterHandle(user.twitter.username)
          setStep(2)
        }
      }
    }

    verifyExistingTwitter()
  }, [user, user?.twitter?.username, step])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!twitterHandle.trim()) {
      toast({
        title: "Error",
        description: "Please connect your X account first",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      // Verify follower count one last time before upgrade
      const followerCount = await verifyTwitterFollowers(twitterHandle)
      
      if (followerCount < 10000) {
        toast({
          title: "Requirements Not Met",
          description: "You need at least 10,000 X followers to upgrade to a Community Account.",
          variant: "destructive",
        })
        return
      }

      await upgradeToBusinessUser({
        userId,
        twitterHandle,
        twitterFollowers: followerCount,
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
      <h1 className="text-3xl font-bold mb-6">Upgrade to Community Account</h1>

      {step === 1 ? (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Requirements</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Connect your X account</li>
              <li>Have at least 10,000 followers</li>
              <li>Complete your profile information</li>
            </ul>
          </div>

          <div className="text-center">
            <Button onClick={handleTwitterConnect} className="bg-black hover:bg-zinc-800 text-white py-6 px-8">
              <X className="mr-2 h-5 w-5" />
              Connect X Account
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
