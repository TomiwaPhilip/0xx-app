"use client"

import type { ReactNode } from "react"
import { PrivyProvider } from "@privy-io/react-auth"
import { base } from "viem/chains"

export default function PrivyAppProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || ""}
      config={{
        loginMethods: ["wallet", "email"],
        appearance: {
          theme: "light",
          accentColor: "#000000",
        },
        embeddedWallets: {
          createOnLogin: "off",
        },
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      {children}
    </PrivyProvider>
  )
}
