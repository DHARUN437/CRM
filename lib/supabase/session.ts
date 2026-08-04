import { createClient } from "@/lib/supabase/server"
import type { AppRole } from "@/lib/portal-types"

export interface CurrentUser {
  id: string
  email: string
  role: AppRole | null
  name: string | null
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? "",
    role: (user.app_metadata?.role as AppRole | undefined) ?? null,
    name: (user.user_metadata?.full_name as string | undefined) ?? null,
  }
}

/**
 * Current user's team member row (workers/admins), used to resolve names.
 */
export async function getCurrentTeamMember(
  userId: string | null
): Promise<{ id: string; name: string; role: "team" | "worker" } | null> {
  if (!userId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from("team_members")
    .select("id, name, role")
    .eq("user_id", userId)
    .maybeSingle()
  return (data as { id: string; name: string; role: "team" | "worker" } | null) ?? null
}