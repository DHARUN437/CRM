"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function DashboardRealtimeSync() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("dashboard-realtime-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_messages" },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_tasks" },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_documents" },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_assignments" },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
