"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createProject } from "@/lib/actions/project-actions"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { ImageIcon, Loader2 } from "lucide-react"

export default function CreatePostForm({ userId, user, linkWallet }: { userId: string; user: any; linkWallet: any }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("activism")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const [needsWallet, setNeedsWallet] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImage(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const checkWalletConnection = async () => {
    if (!user?.wallet) {
      setNeedsWallet(true)
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for your post",
        variant: "destructive",
      })
      return
    }

    if (!image) {
      toast({
        title: "Error",
        description: "Please add an image for your post",
        variant: "destructive",
      })
      return
    }

    // Check if user has connected wallet
    const hasWallet = await checkWalletConnection()
    if (!hasWallet) {
      return
    }

    try {
      setIsSubmitting(true)

      // Get wallet address from Privy user object
      const walletAddress = user?.wallet?.address
      if (!walletAddress) {
        throw new Error("No wallet address found")
      }

      // In a real app, you would upload the image to a storage service
      // and get back a URL. For this example, we'll use a placeholder.
      const imageUrl = "/images/placeholder-post.png"

      await createProject({
        name: title,
        description,
        imageUrl,
        price: 0.01, // Default starting price
        percentChange: 0,
        category,
        creatorId: userId,
        initialSupply: "1000000000", // 1 Billion tokens
        contentURI: imageUrl, // Using the image URL as content URI
      })

      toast({
        title: "Success!",
        description: "Your post has been created",
      })

      router.push("/")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (user?.wallet && needsWallet) {
      setNeedsWallet(false)
    }
  }, [user?.wallet, needsWallet])

  if (needsWallet) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-lg shadow-sm border">
        <h1 className="text-4xl font-bold mb-6">Connect Wallet</h1>
        <p className="mb-6 text-gray-600">
          You need to connect a wallet to create a post. This allows you to receive support from the community.
        </p>
        <Button onClick={() => linkWallet()} className="w-full py-6 bg-black text-white hover:bg-gray-800">
          Connect Wallet
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-lg shadow-sm border">
      <h1 className="text-4xl font-bold mb-6">Create Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Type your text here..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] text-lg"
          />
        </div>

        <div className="space-y-2">
          <div
            onClick={handleImageClick}
            className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${imagePreview ? "border-gray-300" : "border-gray-200"}`}
          >
            {imagePreview ? (
              <div className="relative w-full">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Preview"
                  className="max-h-[300px] mx-auto rounded-md"
                />
              </div>
            ) : (
              <>
                <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500">Add an image or video</p>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Token Distribution</Label>
            <div className="p-3 bg-gray-50 rounded-md text-sm">
              <p className="font-medium mb-1">1 Billion supply will be minted:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>10% allocated to you as creator</li>
                <li>1% withheld by 0XX platform</li>
                <li>89% available for supporters</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="activism">Activism</option>
              <option value="arts">Arts</option>
              <option value="music">Music</option>
              <option value="tech">Tech</option>
            </select>
          </div>
        </div>

        <Button type="submit" className="w-full py-6 bg-black text-white hover:bg-gray-800" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Post"
          )}
        </Button>
      </form>
    </div>
  )
}
