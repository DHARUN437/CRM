"use client"

import { useState } from "react"
import { Building2, FolderKanban, Search, UserPlus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ClientRow } from "@/components/clients/client-row"
import { AddClientDialog } from "@/components/clients/add-client-dialog"
import type { ClientStats, ClientWithStats } from "@/lib/clients"

export function ClientTable({
  clients,
  stats,
}: {
  clients: ClientWithStats[]
  stats: ClientStats
}) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? clients.filter((c) => {
        const haystack = `${c.company} ${c.name} ${c.email}`.toLowerCase()
        return haystack.includes(query.trim().toLowerCase())
      })
    : clients

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Building2 className="size-4" />}
          label="Total clients"
          value={stats.totalClients}
        />
        <StatCard
          icon={<FolderKanban className="size-4" />}
          label="Active projects"
          value={stats.activeProjects}
        />
        <StatCard
          icon={<UserPlus className="size-4" />}
          label="New this month"
          value={stats.newThisMonth}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-balance text-2xl font-semibold tracking-tight">Clients</h2>
            <p className="text-sm text-muted-foreground">
              Add clients here so they appear in the new-project dropdown.
            </p>
          </div>
          <AddClientDialog />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients..."
            className="pl-9"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                {query.trim() ? "No clients match your search." : (
                  <>
                    No clients yet. Add your first client to start creating projects
                    for them.
                  </>
                )}
              </p>
            ) : (
              <div className="divide-y divide-foreground/10">
                {filtered.map((client) => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}