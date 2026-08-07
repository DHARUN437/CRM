"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollText, Calendar } from "lucide-react"

export interface AuditLogItem {
  id: string
  actorId: string | null
  actorName: string
  action: string
  entityType: string
  entityId: string
  summary: string
  createdAt: string
}

interface AuditLogClientProps {
  initialLogs: AuditLogItem[]
}

const ACTION_META: Record<string, { label: string; tone: string }> = {
  "lead.stage_changed": {
    label: "Lead stage changed",
    tone: "bg-info/15 text-info font-semibold",
  },
  "lead.deleted": {
    label: "Lead deleted",
    tone: "bg-destructive/15 text-destructive font-semibold",
  },
  "client.deleted": {
    label: "Client deleted",
    tone: "bg-destructive/15 text-destructive font-semibold",
  },
  "role.changed": {
    label: "Role changed",
    tone: "bg-warning/15 text-warning font-semibold",
  },
  "meeting.created": {
    label: "Meeting requested",
    tone: "bg-primary/15 text-primary font-semibold",
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AuditLogClient({ initialLogs }: AuditLogClientProps) {
  const [range, setRange] = useState<"30d" | "90d" | "all">("all")

  const filteredLogs = initialLogs.filter((log) => {
    if (range === "all") return true
    const logTime = new Date(log.createdAt).getTime()
    const now = Date.now()
    const days = range === "30d" ? 30 : 90
    return now - logTime <= days * 24 * 60 * 60 * 1000
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Date Range Filter Controls */}
      <div className="flex items-center justify-between gap-4 bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)]/60 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
          <Calendar className="size-4 text-[var(--accent)]" />
          Filter Date Range:
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={range === "30d" ? "default" : "outline"}
            onClick={() => setRange("30d")}
            className={`text-xs h-8 rounded-lg font-semibold ${
              range === "30d" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)]"
            }`}
          >
            Last 30 Days
          </Button>

          <Button
            size="sm"
            variant={range === "90d" ? "default" : "outline"}
            onClick={() => setRange("90d")}
            className={`text-xs h-8 rounded-lg font-semibold ${
              range === "90d" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)]"
            }`}
          >
            Last 90 Days
          </Button>

          <Button
            size="sm"
            variant={range === "all" ? "default" : "outline"}
            onClick={() => setRange("all")}
            className={`text-xs h-8 rounded-lg font-semibold ${
              range === "all" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)]"
            }`}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Log Feed */}
      {filteredLogs.length === 0 ? (
        <Card className="bg-[var(--surface)] border-[var(--border)]/60">
          <CardContent className="p-10 text-center text-sm text-[var(--text-secondary)]">
            <ScrollText className="mx-auto mb-2 size-8 text-[var(--text-muted)]" />
            No audit events found for selected range ({range === "30d" ? "Last 30 days" : range === "90d" ? "Last 90 days" : "All time"}).
            System activities, lead changes, and role updates will appear here automatically.
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[var(--surface)] border-[var(--border)]/60 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border)]/40">
              {filteredLogs.map((log) => {
                const meta = ACTION_META[log.action] ?? {
                  label: log.action,
                  tone: "bg-[var(--background)] text-[var(--text-secondary)] font-semibold",
                }

                return (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-[var(--background)]/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={meta.tone}>{meta.label}</Badge>
                          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            {log.entityType}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)]">
                          {log.summary}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {log.actorName}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
