"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import {
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  SearchX,
} from "lucide-react"
import { formatBytes } from "@/lib/portal-types"
import { cn } from "@/lib/utils"

export interface TeamDocument {
  id: string
  name: string
  file_path: string
  file_type: string
  file_size: number
  created_at: string
  projects: { name: string } | null
  clients: { name: string; company: string | null } | null
}

interface DocumentsViewProps {
  documents: TeamDocument[]
}

function FileIcon({ type, className }: { type: string; className?: string }) {
  if (type.includes("image")) return <FileImage className={className} />
  if (type.includes("pdf")) return <FileText className={className} />
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className={className} />
  if (type.includes("zip") || type.includes("rar") || type.includes("7z"))
    return <FileArchive className={className} />
  return <FileText className={className} />
}

export function DocumentsView({ documents }: DocumentsViewProps) {
  const [query, setQuery] = useState("")
  const [projectFilter, setProjectFilter] = useState("all")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [action, setAction] = useState<"open" | "download">("open")

  const projectOptions = Array.from(
    new Map(
      documents
        .map((d) => d.projects?.name)
        .filter((n): n is string => Boolean(n))
        .map((name) => [name, name])
    ).values()
  )

  const filtered = documents.filter((doc) => {
    if (projectFilter !== "all" && doc.projects?.name !== projectFilter) return false
    if (query) {
      const q = query.toLowerCase()
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.clients?.company?.toLowerCase().includes(q) ||
        doc.clients?.name.toLowerCase().includes(q)
      )
    }
    return true
  })

  async function getSignedUrl(doc: TeamDocument, download: boolean) {
    setBusyId(doc.id)
    setAction(download ? "download" : "open")
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.file_path, 3600, download ? { download: doc.name } : undefined)
    setBusyId(null)
    if (error) {
      alert("Could not access this document. Please try again.")
      return
    }
    window.open(data.signedUrl, "_blank")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by file, client or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projectOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-foreground/20 p-12 text-center">
          <SearchX className="size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No documents found</p>
          <p className="text-sm text-muted-foreground">
            Documents uploaded by clients through the portal will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_160px] gap-4 border-b border-foreground/10 bg-foreground/5 px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid">
            <span>Document</span>
            <span>Client / Company</span>
            <span>Size</span>
            <span className="text-right">Actions</span>
          </div>

          {filtered.map((doc, index) => (
            <div
              key={doc.id}
              className={cn(
                "grid grid-cols-1 items-center gap-3 bg-background px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_160px] md:gap-4",
                index > 0 && "border-t border-foreground/5"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                  <FileIcon type={doc.file_type} className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.projects?.name ?? "Unknown project"} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-col">
                <p className="truncate text-sm">{doc.clients?.name ?? "Unknown"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {doc.clients?.company ?? "—"}
                </p>
              </div>

              <span className="text-sm text-muted-foreground">
                {formatBytes(doc.file_size)}
              </span>

              <div className="flex items-center gap-2 md:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => getSignedUrl(doc, false)}
                  disabled={busyId === doc.id}
                >
                  {busyId === doc.id && action === "open" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => getSignedUrl(doc, true)}
                  disabled={busyId === doc.id}
                >
                  {busyId === doc.id && action === "download" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
