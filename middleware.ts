import { NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"

// This middleware protects routes that require authentication
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup")
    const isAuth = !!req.nextauth.token

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // This callback is called on every request to check if the user is authorized
      authorized({ req, token }) {
        const { pathname } = req.nextUrl
        // Only require authentication for dashboard routes
        if (pathname.startsWith("/dashboard")) {
          return !!token
        }
        // Allow all other routes
        return true
      },
    },
  },
)

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
}
