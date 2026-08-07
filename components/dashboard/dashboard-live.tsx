"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const REFRESH_DEBOUNCE_MS = 1000
const MOUNT_GUARD_MS = 2500

export function DashboardRealtimeSync() {
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(false)

  useEffect(() => {
    // Prevent initial realtime channel subscription handshake from triggering router.refresh()
    const guardTimer = setTimeout(() => {
      isMountedRef.current = true
    }, MOUNT_GUARD_MS)

    const supabase = createClient()

    const requestRefresh = () => {
      if (!isMountedRef.current) return
      if (refreshTimer.current) return
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        router.refresh()
      }, REFRESH_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel("dashboard-realtime-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_messages" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_tasks" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_documents" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_assignments" },
        requestRefresh
      )
      .subscribe()

    return () => {
      clearTimeout(guardTimer)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
