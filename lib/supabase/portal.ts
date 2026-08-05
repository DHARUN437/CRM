import type { SupabaseClient } from "@supabase/supabase-js"
import type { ClientProfile } from "@/lib/portal-types"

/**
 * Returns the client profile for the signed-in user. Requires an active
 * auth session; returns null when signed out so pages can redirect to login.
 */
export async function getActiveClient(
  supabase: SupabaseClient
): Promise<ClientProfile | null> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return null

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      console.error("Error in getActiveClient query:", error)
      return null
    }

    return (data as ClientProfile | null) ?? null
  } catch (err) {
    console.error("Exception in getActiveClient:", err)
    return null
  }
}
