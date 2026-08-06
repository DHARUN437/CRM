import { NextResponse, type NextRequest } from "next/server"

/**
 * Explicit origin allowlist for API cross-origin requests.
 *
 * Never use `*` here: `Access-Control-Allow-Origin: *` combined with
 * `Access-Control-Allow-Credentials: true` is invalid anyway, and it defeats
 * any cookie/session protection on the routes. Populate via the
 * `CORS_ALLOWED_ORIGINS` environment variable (comma-separated), e.g.
 *   CORS_ALLOWED_ORIGINS=https://crm.example.com,https://portal.example.com
 *
 * Requests with no Origin header (same-origin, server-to-server, curl) pass
 * through unchanged; browser cross-origin requests are answered only when the
 * Origin is on the allowlist.
 */
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
)

const METHODS = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
const HEADERS =
  "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey, x-client-info, x-supabase-api-version"

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  const normalized = origin.replace(/\/$/, "")
  return ALLOWED_ORIGINS.has(normalized)
}

export function handleCors(request: NextRequest, response?: NextResponse): NextResponse {
  const origin = request.headers.get("origin")

  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) {
      // Reject preflight from unknown origins.
      return new NextResponse(null, { status: 204 })
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin!,
        "Access-Control-Allow-Methods": METHODS,
        "Access-Control-Allow-Headers": HEADERS,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    })
  }

  const res = response ?? NextResponse.next()
  if (isAllowedOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin!)
    res.headers.set("Access-Control-Allow-Credentials", "true")
  }
  return res
}
