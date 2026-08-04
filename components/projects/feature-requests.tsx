"use client"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, Lightbulb } from "lucide-react"
import {
  FEATURE_REQUEST_STATUS_META,
  FEATURE_REQUEST_PRIORITY_META,
  type FeatureRequest,
  type FeatureRequestStatus,
} from "@/lib/portal-types"
import { relativeTime } from "@/lib/crm"

interface FeatureRequestsListProps {
  requests: FeatureRequest[]
  isAdmin?: boolean
}

export function FeatureRequestsList({ requests, isAdmin }: FeatureRequestsListProps) {
  return (
    <div className="flex flex-col gap-3">
      {!requests.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <Lightbulb className="size-8 text-muted-foreground/50" />
            No feature requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
          {requests.map((request, index) => (
            <div key={request.id}>
              {index > 0 && <div className="h-px bg-foreground/10" />}
              <FeatureRequestRow request={request} isAdmin={isAdmin} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeatureRequestRow({
  request,
  isAdmin,
}: {
  request: FeatureRequest
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  async function updateStatus(status: FeatureRequestStatus) {
    setUpdating(true)
    const supabase = createClient()
    await supabase
      .from("feature_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", request.id)
    setUpdating(false)
    router.refresh()
  }

  const statusMeta = FEATURE_REQUEST_STATUS_META[request.status]
  const priorityMeta = FEATURE_REQUEST_PRIORITY_META[request.priority]

  return (
    <div className="flex items-center justify-between gap-3 bg-background p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-sm font-medium">{request.title}</p>
        {request.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {request.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {relativeTime(request.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className={priorityMeta.badge}>{priorityMeta.label}</Badge>
        {isAdmin && !updating ? (
          <Select
            value={request.status}
            onValueChange={(v) => updateStatus(v as FeatureRequestStatus)}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["open", "in_progress", "completed", "declined"] as const).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {FEATURE_REQUEST_STATUS_META[s].label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        ) : (
          <Badge className={statusMeta.badge}>{statusMeta.label}</Badge>
        )}
        {updating && <Loader2 className="size-3 animate-spin" />}
      </div>
    </div>
  )
}
