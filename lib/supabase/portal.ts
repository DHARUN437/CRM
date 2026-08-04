import type { SupabaseClient } from "@supabase/supabase-js"
import type { ClientProfile } from "@/lib/portal-types"

/**
 * Returns the client profile for the signed-in user. Requires an active
 * auth session; returns null when signed out so pages can redirect to login.
 */
export async function getActiveClient(
  supabase: SupabaseClient
): Promise<ClientProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  return (data as ClientProfile | null) ?? null
}
