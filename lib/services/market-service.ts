import { getContentTokenDetails } from "@/lib/content"
import type { ContentTokenInfo } from "@/lib/content"
import { getTokenPrice } from "./trading-service"

export interface MarketData {
  price: string
  marketCap: string
  totalSupply: string
  circulatingSupply: string
  volume24h: string
  priceChange24h: number
}

export async function getTokenMarketData(tokenAddress: string): Promise<MarketData> {
  try {
    // Get token details from Zora
    const tokenInfo = await getContentTokenDetails(tokenAddress as `0x${string}`)
    if (!tokenInfo) {
      throw new Error("Failed to get token details")
    }

    // Get current price from contract
    const currentPrice = await getTokenPrice(tokenAddress)

    // For now, use simple calculations for other metrics
    const totalSupply = tokenInfo.totalSupply || BigInt(0)
    const marketCap = currentPrice * totalSupply
    const circulatingSupply = totalSupply * BigInt(89) / BigInt(100) // 89% of total supply
    
    // Placeholder values for now
    const volume24h = (marketCap * BigInt(5)) / BigInt(100) // 5% of market cap
    const priceChange24h = 2.5 // +2.5%

    return {
      price: currentPrice.toString(),
      marketCap: marketCap.toString(),
      totalSupply: totalSupply.toString(),
      circulatingSupply: circulatingSupply.toString(),
      volume24h: volume24h.toString(),
      priceChange24h,
    }
  } catch (error) {
    console.error("Error fetching market data:", error)
    throw error
  }
}

export async function updateProjectMarketData(project: any): Promise<void> {
  if (!project.tokenAddress) return

  try {
    const marketData = await getTokenMarketData(project.tokenAddress)
    
    // Update project with market data
    project.price = parseFloat(marketData.price) / 1e18 // Convert from wei to ETH
    project.marketCap = parseFloat(marketData.marketCap) / 1e18
    project.percentChange = marketData.priceChange24h
    project.currentSupply = marketData.circulatingSupply
  } catch (error) {
    console.error("Error updating market data:", error)
    // Don't throw, just log the error and continue
  }
} 