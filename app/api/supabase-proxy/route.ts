import { createClient } from "@/lib/supabase/server"
import { handleCors, CORS_HEADERS } from "@/lib/cors"
import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table, action, query } = body

    if (!table) {
      return NextResponse.json(
        { error: "Table parameter is required" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const supabase = await createClient()

    let result
    if (action === "select") {
      result = await supabase.from(table).select(query || "*")
    } else {
      result = await supabase.from(table).select("*")
    }

    return NextResponse.json(result, { status: 200, headers: CORS_HEADERS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy exception"
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
