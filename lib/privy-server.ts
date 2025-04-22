import { cookies } from "next/headers"
import { PrivyClient } from "@privy-io/server-auth"

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || ""

const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET)

export async function getPrivyUserFromCookie() {
  const cookieStore = cookies()
  const privyToken = cookieStore.get("privy-token")

  if (!privyToken) return null

  try {
    const { user } = await privyClient.verifyAuthToken(privyToken.value)
    return user
  } catch (error) {
    console.error("Failed to verify Privy token:", error)
    return null
  }
}
