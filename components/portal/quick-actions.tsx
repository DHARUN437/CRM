"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, HelpCircle, Upload, Calendar, Receipt } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog"

export function QuickActions() {
  const [scheduleOpen, setScheduleOpen] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-wrap items-center gap-3 mt-4"
      >
        <Link href="/portal/requests">
          <Button
            variant="outline"
            className="rounded-full bg-card/60 backdrop-blur-md hover:bg-card hover:-translate-y-0.5 transition-all shadow-sm text-sm border-border/50"
          >
            <Plus className="mr-2 size-4 text-[var(--accent)]" />
            New Feature Request
          </Button>
        </Link>

        <Button
          variant="outline"
          onClick={() => setScheduleOpen(true)}
          className="rounded-full bg-card/60 backdrop-blur-md hover:bg-card hover:-translate-y-0.5 transition-all shadow-sm text-sm border-border/50"
        >
          <Calendar className="mr-2 size-4 text-[var(--accent)]" />
          Schedule Meeting
        </Button>

        <Link href="/portal/documents">
          <Button
            variant="outline"
            className="rounded-full bg-card/60 backdrop-blur-md hover:bg-card hover:-translate-y-0.5 transition-all shadow-sm text-sm border-border/50"
          >
            <Upload className="mr-2 size-4 text-[var(--accent)]" />
            Upload Document
          </Button>
        </Link>

        <Link href="/portal/invoices">
          <Button
            variant="outline"
            className="rounded-full bg-card/60 backdrop-blur-md hover:bg-card hover:-translate-y-0.5 transition-all shadow-sm text-sm border-border/50"
          >
            <Receipt className="mr-2 size-4 text-[var(--accent)]" />
            View Invoices
          </Button>
        </Link>
      </motion.div>

      <ScheduleMeetingDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />
    </>
  )
}
