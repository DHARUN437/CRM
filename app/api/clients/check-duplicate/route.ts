import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || (user.role !== "team" && user.role !== "tl")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const company = (url.searchParams.get("company") ?? "").trim()
  if (!company) {
    return NextResponse.json({ duplicateCompany: null })
  }

  // Team RLS hides nothing, so a case-insensitive exact company match on an
  // active client is found here. Email duplicates are intentionally NOT
  // checked per product decision.
  const supabase = await createClient()
  const { data } = await supabase
    .from("clients")
    .select("company")
    .ilike("company", company)
    .limit(1)

  const match = data?.find((c) => c.company?.toLowerCase() === company.toLowerCase())
  return NextResponse.json({ duplicateCompany: match?.company ?? null })
}
