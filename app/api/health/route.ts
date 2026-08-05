import { createClient } from "@/lib/supabase/server"
import { handleCors, CORS_HEADERS } from "@/lib/cors"
import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("projects").select("id").limit(1)

    if (error) {
      return NextResponse.json(
        {
          status: "error",
          connected: false,
          error: error.message,
          message: "Failed to query Supabase DB",
        },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json(
      {
        status: "ok",
        connected: true,
        message: "Supabase DB connection active and working cleanly",
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(
      {
        status: "exception",
        connected: false,
        error: message,
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
