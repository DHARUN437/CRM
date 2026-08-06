import type { SupabaseClient } from "@supabase/supabase-js"
import type { ClientProfile } from "@/lib/portal-types"

/**
 * Returns the pending request count for a given client ID.
 */
export async function getPendingRequestCount(
  supabase: SupabaseClient,
  clientId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("client_requests")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "pending")

    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

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

    // 1. Try to find client by user_id
    let { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching client by user_id:", error.message || error)
    }

    // 2. Fallback: Try matching by email
    if (!data && user.email) {
      const { data: dataByEmail } = await supabase
        .from("clients")
        .select("*")
        .eq("email", user.email)
        .maybeSingle()

      if (dataByEmail) {
        data = dataByEmail
        // Update user_id in clients table if missing
        if (!dataByEmail.user_id) {
          await supabase
            .from("clients")
            .update({ user_id: user.id })
            .eq("id", dataByEmail.id)
        }
      }
    }

    // 3. Fallback: Generate profile from auth user details if no database row exists
    if (!data) {
      data = {
        id: user.id,
        user_id: user.id,
        name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Client",
        company: (user.user_metadata?.company as string) || "Joy Corporate Solutions",
        email: user.email ?? "",
        phone: null,
        created_at: user.created_at || new Date().toISOString(),
      }
    }

    return data as ClientProfile
  } catch (err) {
    console.error("Exception in getActiveClient:", err)
    return null
  }
}
