import { NextResponse, type NextRequest } from "next/server"

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers":
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Credentials": "true",
}

export function handleCors(request: NextRequest, response?: NextResponse): NextResponse {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: CORS_HEADERS,
    })
  }

  const res = response ?? NextResponse.next()
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.headers.set(key, value)
  })
  return res
}
