import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // You can add authentication checks here if needed
  // For example, redirecting unauthenticated users from protected routes

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Add protected routes here if needed
    // '/dashboard/:path*',
  ],
}
