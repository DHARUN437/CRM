"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const REFRESH_DEBOUNCE_MS = 750

export function DashboardRealtimeSync() {
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Coalesce bursts of realtime events (e.g. a task board update touching
    // tasks + activity_logs together) into a single router.refresh() instead
    // of one full server re-render per event.
    const requestRefresh = () => {
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
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
