import { createContentToken, getContentTokenDetails } from "@/lib/content"
import type { ContentTokenInfo } from "@/lib/content"

export interface CreateCollectionParams {
  name: string
  symbol: string
  contentURI: string
  initialSupply: bigint
  creatorAddress: `0x${string}`
}

export async function createCollection({
  name,
  symbol,
  contentURI,
  initialSupply,
  creatorAddress,
}: CreateCollectionParams): Promise<string> {
  try {
    const tokenAddress = await createContentToken(
      name,
      symbol,
      contentURI,
      initialSupply,
      creatorAddress
    )

    if (!tokenAddress) {
      throw new Error("Failed to create content token")
    }

    return tokenAddress
  } catch (error) {
    console.error("Error creating collection:", error)
    throw error
  }
}

export async function getCollectionMetadata(tokenAddress: string): Promise<ContentTokenInfo> {
  try {
    const tokenInfo = await getContentTokenDetails(tokenAddress as `0x${string}`)
    if (!tokenInfo) {
      throw new Error("Failed to get token details")
    }
    return tokenInfo
  } catch (error) {
    console.error("Error getting collection metadata:", error)
    throw error
  }
} 