"use client"

import { useEffect } from "react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function getPendingRequestCount(clientId: string): Promise<number> {
  try {
    const supabase = await createServerClient()
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

export function useCapacitorPushNotifications(userId?: string | null) {
  useEffect(() => {
    if (!userId || typeof window === "undefined") return

    let isMounted = true

    async function initPush() {
      try {
        const { Capacitor } = await import("@capacitor/core")
        if (!Capacitor.isNativePlatform()) return

        const { PushNotifications } = await import("@capacitor/push-notifications")

        let permStatus = await PushNotifications.checkPermissions()

        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions()
        }

        if (permStatus.receive !== "granted") {
          console.warn("Push Notification permission denied by user.")
          return
        }

        await PushNotifications.register()

        // Handle successful token registration
        PushNotifications.addListener("registration", async (token) => {
          if (!isMounted || !token.value) return
          const supabase = createBrowserClient()
          await supabase.from("user_devices").upsert(
            {
              user_id: userId,
              token: token.value,
              platform: Capacitor.getPlatform(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id, token" }
          )
        })

        // Handle error on registration
        PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error:", err.error)
        })

        // Handle foreground notification arrival
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push notification received in foreground:", notification)
        })

        // Handle notification tap action (deep-link to chat / project)
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const data = action.notification.data
          if (data && data.projectId) {
            window.location.href = `/projects/${data.projectId}`
          } else if (data && data.link) {
            window.location.href = data.link
          }
        })
      } catch (err) {
        console.error("Failed to initialize push notifications:", err)
      }
    }

    initPush()

    return () => {
      isMounted = false
    }
  }, [userId])
}
