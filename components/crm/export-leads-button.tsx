"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Lead } from "@/lib/crm"

export function ExportLeadsButton({ leads }: { leads: Lead[] }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const blob = new Blob([JSON.stringify(leads, null, 2)], {
          type: "application/json",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `leads-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      }}
    >
      <Download />
      Export
    </Button>
  )
}
