"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const REFRESH_DEBOUNCE_MS = 600

export function PortalRealtimeSync() {
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const requestRefresh = () => {
      if (refreshTimer.current) return
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        router.refresh()
      }, REFRESH_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel("portal-realtime-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "document_requests" },
        requestRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_requests" },
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
        { event: "*", schema: "public", table: "projects" },
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
