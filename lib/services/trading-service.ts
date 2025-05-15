import { buyContentToken, sellContentToken, getContentTokenDetails } from "@/lib/content"
import { getDeadlineTimestamp } from "@/lib/content"

export interface TradeParams {
  tokenAddress: string
  amount: bigint
  minReceived: bigint
  account: `0x${string}`
}

export async function buyTokens({
  tokenAddress,
  amount,
  minReceived,
  account,
}: TradeParams): Promise<{ hash: string; amountOut: bigint | null }> {
  try {
    const deadline = getDeadlineTimestamp()
    const result = await buyContentToken(
      account,
      tokenAddress,
      amount,
      minReceived,
      deadline
    )
    return result
  } catch (error) {
    console.error("Error buying tokens:", error)
    throw error
  }
}

export async function sellTokens({
  tokenAddress,
  amount,
  minReceived,
  account,
}: TradeParams): Promise<{ hash: string; amountOut: bigint | null }> {
  try {
    const deadline = getDeadlineTimestamp()
    const result = await sellContentToken(
      account,
      tokenAddress,
      amount,
      minReceived,
      deadline
    )
    return result
  } catch (error) {
    console.error("Error selling tokens:", error)
    throw error
  }
}

export async function getTokenPrice(tokenAddress: string): Promise<bigint> {
  try {
    const tokenInfo = await getContentTokenDetails(tokenAddress as `0x${string}`)
    if (!tokenInfo?.price) {
      throw new Error("Failed to get token price")
    }
    return BigInt(tokenInfo.price)
  } catch (error) {
    console.error("Error getting token price:", error)
    throw error
  }
} 