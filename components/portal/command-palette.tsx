"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, FolderKanban, Files, Receipt, FileQuestion, Users } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, documents, invoices..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Links">
          <CommandItem onSelect={() => runCommand(() => router.push("/portal/projects"))}>
            <FolderKanban className="mr-2 size-4" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/portal/documents"))}>
            <Files className="mr-2 size-4" />
            <span>Documents</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/portal/invoices"))}>
            <Receipt className="mr-2 size-4" />
            <span>Invoices</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/portal/requests"))}>
            <FileQuestion className="mr-2 size-4" />
            <span>Requests</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
