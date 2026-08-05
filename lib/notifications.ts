import { createClient } from "@/lib/supabase/server"
import type { NotificationItem, NotificationType } from "@/lib/portal-types"

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)

  return (data ?? []) as NotificationItem[]
}

export async function createNotification({
  userId,
  title,
  message,
  link,
  type = "info",
}: {
  userId: string
  title: string
  message: string
  link?: string
  type?: NotificationType
}) {
  const supabase = await createClient()

  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    link: link ?? null,
    type,
  })
}

/**
 * Count pending document requests across all of a client's projects.
 */
export async function getPendingRequestCount(clientId: string): Promise<number> {
  const supabase = await createClient()

  const { data: projectIds } = await supabase
    .from("projects")
    .select("id")
    .eq("client_id", clientId)

  if (!projectIds?.length) return 0

  const { count } = await supabase
    .from("document_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .in("project_id", projectIds.map((p) => p.id))

  return count ?? 0
}

/**
 * Count unread notifications for a user.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false)

  return count ?? 0
}
