import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { handleCors } from "@/lib/cors"

const APP_PREFIXES = [
  "/dashboard",
  "/projects",
  "/documents",
  "/crm",
  "/team",
  "/clients",
  "/invoices",
  "/chat",
]

const PORTAL_PREFIXES = ["/portal"]

export async function proxy(request: NextRequest) {
  // Handle preflight CORS requests immediately
  if (request.method === "OPTIONS") {
    return handleCors(request)
  }

  const { supabaseResponse, user } = await updateSession(request)

  // Attach allowlist-checked CORS headers to the response (no-op when the
  // request Origin is not an allowed origin).
  const response = handleCors(request, supabaseResponse)

  const { pathname } = request.nextUrl
  const role = user?.app_metadata?.role as string | undefined

  const isAppRoute = APP_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isPortalRoute = PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isPortalLogin = pathname === "/portal/login"

  // Protected agency app routes — require a signed-in admin or worker.
  if (isAppRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
    if (role === "client") {
      const url = request.nextUrl.clone()
      url.pathname = "/portal"
      return NextResponse.redirect(url)
    }
  }

  // Protected client portal routes — require a signed-in client.
  if (isPortalRoute) {
    if (!user && !isPortalLogin) {
      const url = request.nextUrl.clone()
      url.pathname = "/portal/login"
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
    if (user && isPortalLogin) {
      const url = request.nextUrl.clone()
      url.pathname = (role === "team" || role === "worker" || role === "tl") ? "/dashboard" : "/portal"
      return NextResponse.redirect(url)
    }
    if (user && (role === "team" || role === "worker" || role === "tl")) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // Already signed in — skip the login page.
  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone()
    url.pathname = (role === "team" || role === "worker" || role === "tl") ? "/dashboard" : "/portal"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}