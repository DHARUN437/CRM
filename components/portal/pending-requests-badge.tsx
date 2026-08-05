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
    const supabase = createClient()

    async function refresh() {
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", clientId)
      if (!projects?.length) {
        setCount(0)
        return
      }
      const { count: pending } = await supabase
        .from("document_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .in(
          "project_id",
          projects.map((p) => p.id)
        )
      setCount(pending ?? 0)
    }

    void refresh()

    const channel = supabase
      .channel("pending-requests-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "document_requests",
        },
        () => void refresh()
      )
      .subscribe()

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
