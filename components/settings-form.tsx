"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { updateUserProfile } from "@/lib/actions/user-actions"
import type { User } from "@/lib/types"
import { ImageIcon, Loader2, Twitter, Wallet, Mail, Bell, Shield, UserIcon } from "lucide-react"
import Image from "next/image"

export default function SettingsForm({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState("profile")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(user.profileImage || null)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(user.coverImage || null)
  const [name, setName] = useState(user.name || "")
  const [bio, setBio] = useState(user.bio || "")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [supportNotifications, setSupportNotifications] = useState(true)
  const [commentNotifications, setCommentNotifications] = useState(true)
  const [publicProfile, setPublicProfile] = useState(true)
  const [showSupporters, setShowSupporters] = useState(true)

  const profileImageRef = useRef<HTMLInputElement>(null)
  const coverImageRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const router = useRouter()
  const { user: privyUser, linkWallet, linkEmail, linkTwitter } = usePrivy()

  const handleProfileImageClick = () => {
    profileImageRef.current?.click()
  }

  const handleCoverImageClick = () => {
    coverImageRef.current?.click()
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProfileImage(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverImage(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    try {
      setIsSubmitting(true)

      // In a real app, you would upload the images to a storage service
      // and get back URLs. For this example, we'll use the previews.
      const profileImageUrl = profileImagePreview
      const coverImageUrl = coverImagePreview

      await updateUserProfile({
        userId: user._id,
        name,
        bio,
        profileImage: profileImageUrl,
        coverImage: coverImageUrl,
      })

      toast({
        title: "Success!",
        description: "Your profile has been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setIsSubmitting(true)

      // In a real app, you would save these preferences to the database
      // For this example, we'll just show a success message

      toast({
        title: "Success!",
        description: "Your notification preferences have been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSavePrivacy = async () => {
    try {
      setIsSubmitting(true)

      // In a real app, you would save these preferences to the database
      // For this example, we'll just show a success message

      toast({
        title: "Success!",
        description: "Your privacy settings have been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update privacy settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

      <Tabs defaultValue="profile" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon size={16} />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Mail size={16} />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center gap-2">
            <Wallet size={16} />
            <span className="hidden sm:inline">Wallet</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell size={16} />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield size={16} />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Profile Information</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    className="min-h-[120px]"
                  />
                </div>

                {user.userType === "business" && (
                  <div className="space-y-2">
                    <Label htmlFor="twitterHandle">Twitter Handle</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                        @
                      </span>
                      <Input
                        id="twitterHandle"
                        value={user.twitterHandle || ""}
                        readOnly
                        className="rounded-l-none bg-gray-50"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      {user.twitterFollowers ? `${(user.twitterFollowers / 1000).toFixed(1)}K followers` : ""}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSaveProfile}
                  className="w-full bg-black text-white hover:bg-gray-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Profile Images</h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Profile Picture</Label>
                  <div
                    onClick={handleProfileImageClick}
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Avatar className="h-32 w-32 border-2 border-gray-200">
                      {profileImagePreview ? (
                        <AvatarImage src={profileImagePreview || "/placeholder.svg"} alt="Profile" />
                      ) : (
                        <>
                          <AvatarFallback>
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <p className="text-sm text-gray-500 mt-2">Click to change</p>
                    <input
                      type="file"
                      ref={profileImageRef}
                      onChange={handleProfileImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <div onClick={handleCoverImageClick} className="cursor-pointer">
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                      {coverImagePreview ? (
                        <Image
                          src={coverImagePreview || "/placeholder.svg"}
                          alt="Cover"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Click to change</p>
                    <input
                      type="file"
                      ref={coverImageRef}
                      onChange={handleCoverImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{user.email || "No email connected"}</p>
                    <p className="text-sm text-gray-500">Primary email</p>
                  </div>
                </div>
                {!user.email && (
                  <Button onClick={() => linkEmail()} variant="outline">
                    Connect Email
                  </Button>
                )}
              </div>

              {user.userType === "business" && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Twitter className="h-5 w-5 text-[#1DA1F2]" />
                    <div>
                      <p className="font-medium">
                        {user.twitterHandle ? `@${user.twitterHandle}` : "No Twitter connected"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user.twitterFollowers
                          ? `${(user.twitterFollowers / 1000).toFixed(1)}K followers`
                          : "Connect to verify followers"}
                      </p>
                    </div>
                  </div>
                  {!user.twitterHandle && (
                    <Button onClick={() => linkTwitter()} variant="outline">
                      Connect Twitter
                    </Button>
                  )}
                </div>
              )}

              {user.userType === "normal" && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Upgrade to Community Account</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create your own posts and receive support from the community.
                  </p>
                  <Button
                    onClick={() => router.push("/profile/upgrade")}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    Upgrade Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Wallet Settings */}
        <TabsContent value="wallet" className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Connected Wallets</h2>

            <div className="space-y-4">
              {user.walletAddress ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {user.walletAddress.substring(0, 6)}...
                        {user.walletAddress.substring(user.walletAddress.length - 4)}
                      </p>
                      <p className="text-sm text-gray-500">Primary wallet</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-lg">
                  <p className="text-gray-500 mb-4">No wallets connected</p>
                  <Button onClick={() => linkWallet()} className="bg-black text-white hover:bg-gray-800">
                    Connect Wallet
                  </Button>
                </div>
              )}

              <div className="mt-6">
                <h3 className="font-semibold mb-2">Transaction History</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    View your transaction history and manage your supported projects.
                  </p>
                  <Button
                    onClick={() => router.push(`/profile/${user._id}?tab=collections`)}
                    variant="outline"
                    className="mt-4"
                  >
                    View Transactions
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive updates via email</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Support Notifications</p>
                    <p className="text-sm text-gray-500">Get notified when someone supports your projects</p>
                  </div>
                  <Switch checked={supportNotifications} onCheckedChange={setSupportNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Comment Notifications</p>
                    <p className="text-sm text-gray-500">Get notified when someone comments on your projects</p>
                  </div>
                  <Switch checked={commentNotifications} onCheckedChange={setCommentNotifications} />
                </div>
              </div>

              <Button
                onClick={handleSaveNotifications}
                className="w-full bg-black text-white hover:bg-gray-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Notification Preferences"
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Public Profile</p>
                    <p className="text-sm text-gray-500">Allow others to view your profile</p>
                  </div>
                  <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Supporters</p>
                    <p className="text-sm text-gray-500">Display your supporters on your profile</p>
                  </div>
                  <Switch checked={showSupporters} onCheckedChange={setShowSupporters} />
                </div>
              </div>

              <Button
                onClick={handleSavePrivacy}
                className="w-full bg-black text-white hover:bg-gray-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Privacy Settings"
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
