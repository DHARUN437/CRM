"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { FeatureRequestsList } from "@/components/projects/feature-requests"
import { type FeatureRequest } from "@/lib/portal-types"

interface FeatureRequestsLiveProps {
  projectId: string
  isAdmin?: boolean
  initialRequests: FeatureRequest[]
}

export function FeatureRequestsLive({
  projectId,
  isAdmin,
  initialRequests,
}: FeatureRequestsLiveProps) {
  const [requests, setRequests] = useState<FeatureRequest[]>(initialRequests)

  useEffect(() => {
    const supabase = createClient()

    function refresh() {
      return supabase
        .from("feature_requests")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setRequests(data as unknown as FeatureRequest[])
        })
    }

    void refresh()

    const channel = supabase
      .channel(`feature-requests-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feature_requests",
          filter: `project_id=eq.${projectId}`,
        },
        () => void refresh()
      )
      .subscribe()

    const interval = setInterval(refresh, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [projectId])

  return <FeatureRequestsList requests={requests} isAdmin={isAdmin} />
}
