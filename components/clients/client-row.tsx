"use client"

import { Building2, FolderKanban, Mail, Phone, UserRound } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { EditClientDialog } from "@/components/clients/edit-client-dialog"
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog"
import type { ClientWithStats } from "@/lib/clients"
import {
  PROJECT_STATUS_META,
  type ProjectStatus,
} from "@/lib/portal-types"

const MAX_STATUS_BADGES = 3

export function ClientRow({ client }: { client: ClientWithStats }) {
  const displayName = client.company ? `${client.company} (${client.name})` : client.name

  const statuses = client.projects.map((p) => ({
    id: p.id,
    status: p.status as ProjectStatus,
    meta: PROJECT_STATUS_META[p.status as ProjectStatus],
  }))
  const visibleStatuses = statuses.slice(0, MAX_STATUS_BADGES)
  const hiddenStatusCount = Math.max(statuses.length - MAX_STATUS_BADGES, 0)

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/40">
      <Link href={`/clients/${client.id}`} className="flex min-w-0 items-start sm:items-center gap-3.5 group">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Building2 className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">
              {client.company ?? client.name}
            </p>
            {client.company && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <UserRound className="size-3" />
                {client.name}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3" />
              {client.email}
            </span>
            {client.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {client.phone}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
            <FolderKanban className="size-3.5" />
            {client.projectCount} {client.projectCount === 1 ? "project" : "projects"}
          </span>
          {visibleStatuses.length > 0 && (
            <span className="hidden items-center gap-1 md:flex">
              {visibleStatuses.map(({ id, meta }) => (
                <Badge key={id} className={meta.badge}>
                  {meta.label}
                </Badge>
              ))}
              {hiddenStatusCount > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  +{hiddenStatusCount}
                </Badge>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <EditClientDialog client={client} />
          <DeleteClientDialog clientId={client.id} clientName={displayName} />
        </div>
      </div>
    </div>
  )
}