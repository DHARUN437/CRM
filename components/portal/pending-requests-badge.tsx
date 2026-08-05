"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface PendingRequestsBadgeProps {
  clientId: string
  initialCount: number
}

export function PendingRequestsBadge({
  clientId,
  initialCount,
}: PendingRequestsBadgeProps) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    const supabase = createClient()

    async function refresh() {
      try {
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .eq("client_id", clientId)

        if (!projects || projects.length === 0) {
          setCount(0)
          return
        }

        const projectIds = projects.map((p) => p.id)
        const { count: pending } = await supabase
          .from("document_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .in("project_id", projectIds)

        setCount(pending ?? 0)
      } catch (err) {
        console.error("Error refreshing pending requests count:", err)
      }
    }

    // Build realtime channel chain cleanly before calling subscribe()
    const channelName = `pending-req-${clientId.slice(0, 8)}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "document_requests",
        },
        () => {
          void refresh()
        }
      )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId])

  if (count <= 0) return null

  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
      {count}
    </span>
  )
}
