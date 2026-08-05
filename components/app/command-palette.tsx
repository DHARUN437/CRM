"use client"

import {
  ArrowUpRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Receipt,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface PaletteProject {
  id: string
  name: string
}

interface PaletteLead {
  id: string
  company: string
  contact: string
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [projects, setProjects] = useState<PaletteProject[]>([])
  const [leads, setLeads] = useState<PaletteLead[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const supabase = createClient()

    void (async () => {
      const [{ data: projectRows }, { data: leadRows }] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("leads")
          .select("id, company, contact")
          .order("updated_at", { ascending: false })
          .limit(10),
      ])
      if (cancelled) return
      setProjects((projectRows ?? []) as PaletteProject[])
      setLeads((leadRows ?? []) as PaletteLead[])
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="sm:max-w-xl">
      <CommandInput placeholder="Search projects, leads, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard />
            Go to Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/crm")}>
            <Users />
            Go to CRM Pipeline
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")}>
            <FolderKanban />
            Go to Projects
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/crm")}>
            <Plus />
            Create new lead
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")}>
            <FolderKanban />
            Create new project
          </CommandItem>
          <CommandItem onSelect={() => go("/invoices")}>
            <Receipt />
            Manage invoices
          </CommandItem>
        </CommandGroup>
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)}>
                  <FolderKanban />
                  {p.name}
                  <ArrowUpRight className="ml-auto opacity-40" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {leads.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Leads">
              {leads.map((l) => (
                <CommandItem key={l.id} onSelect={() => go("/crm")}>
                  <FileText />
                  {l.company}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {l.contact}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
