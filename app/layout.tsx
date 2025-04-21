import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PrivyProvider } from "@privy-io/react-auth"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "0XX - Support Projects",
  description: "Support projects and causes you care about",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
          config={{
            loginMethods: ["wallet", "email", "twitter"],
            appearance: {
              theme: "light",
              accentColor: "#000000",
            },
            embeddedWallets: {
              createOnLogin: "users-without-wallets",
            },
            chains: [
              {
                id: 8453, // Base chain ID
                name: "Base",
                rpcUrl: "https://mainnet.base.org",
              },
            ],
            defaultChain: 8453, // Base chain ID
          }}
        >
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </PrivyProvider>
      </body>
    </html>
  )
}
