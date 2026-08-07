"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface PendingRequestsBadgeProps {
  clientId: string | null
  initialCount: number
  className?: string
}

export function PendingRequestsBadge({
  clientId,
  initialCount,
  className,
}: PendingRequestsBadgeProps) {
  const [count, setCount] = useState(initialCount)
  const [prevInitialCount, setPrevInitialCount] = useState(initialCount)
  if (prevInitialCount !== initialCount) {
    setPrevInitialCount(initialCount)
    setCount(initialCount)
  }

  useEffect(() => {
    if (!clientId) return

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      const safeId = String(clientId).slice(0, 8) || "default"
      channel = supabase
        .channel(`badge-${safeId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "document_requests",
          },
          async () => {
            try {
              const { data: projects } = await supabase
                .from("projects")
                .select("id")
                .eq("client_id", clientId)

              if (!projects || projects.length === 0) return
              const projectIds = projects.map((p) => p.id)

              const { count: pending } = await supabase
                .from("document_requests")
                .select("id", { count: "exact", head: true })
                .eq("status", "pending")
                .in("project_id", projectIds)

              if (typeof pending === "number") {
                setCount(pending)
              }
            } catch {
              // Ignore background errors safely
            }
          }
        )

      channel.subscribe()
    } catch (e) {
      console.warn("Realtime badge subscription notice:", e)
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [clientId])

  if (count <= 0) return null

  return (
    <span className={`ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground ${className || ""}`}>
      {count}
    </span>
  )
}
