"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, HardDrive, UserX, ExternalLink } from "lucide-react"

export interface EODReportItem {
  id: string
  employeeId: string
  employeeName: string
  reportDate: string
  workSummary: string
  blockers?: string | null
  attachments: {
    id: string
    file_name: string
    file_url?: string
  }[]
  createdAt: string
}

interface AdminEODClientProps {
  initialReports: EODReportItem[]
  employees: { id: string; name: string; email: string }[]
}

export function AdminEODClient({ initialReports, employees }: AdminEODClientProps) {
  const todayStr = new Date().toISOString().split("T")[0]
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")

  // Filter reports
  const filteredReports = initialReports.filter((r) => {
    const dateMatch = !selectedDate || r.reportDate === selectedDate
    const empMatch = selectedEmployee === "all" || r.employeeId === selectedEmployee
    return dateMatch && empMatch
  })

  // Identify who hasn't submitted for selectedDate
  const submittedEmployeeIds = new Set(
    initialReports.filter((r) => r.reportDate === selectedDate).map((r) => r.employeeId)
  )
  const missingEmployees = employees.filter((e) => !submittedEmployeeIds.has(e.id))

  return (
    <div className="flex flex-col gap-6">
      {/* Controls & Missing Submissions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]/60 shadow-sm flex flex-col gap-2">
          <Label className="text-xs font-semibold text-[var(--text-secondary)]">Filter by Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]/60 shadow-sm flex flex-col gap-2">
          <Label className="text-xs font-semibold text-[var(--text-secondary)]">Filter by Employee</Label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full text-xs p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]/60 shadow-sm flex flex-col gap-1 justify-center">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Submission Status ({selectedDate})</span>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {submittedEmployeeIds.size} / {employees.length} Submitted
          </p>
        </div>
      </div>

      {/* Missing Submissions Alert Box */}
      {selectedDate && missingEmployees.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs font-medium">
          <UserX className="size-4 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-bold">Pending EOD Submissions for {selectedDate}:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {missingEmployees.map((e) => (
                <Badge key={e.id} variant="outline" className="bg-background text-warning border-warning/40 text-xs">
                  {e.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EOD Feed */}
      {filteredReports.length === 0 ? (
        <Card className="bg-[var(--surface)] border-[var(--border)]/60">
          <CardContent className="p-10 text-center text-sm text-[var(--text-secondary)]">
            <FileText className="mx-auto mb-2 size-8 text-[var(--text-muted)]" />
            No EOD reports found for the selected filter.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="bg-[var(--surface)] border-[var(--border)]/60 shadow-sm">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)]/40 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      {report.employeeName}
                    </span>
                    <Badge className="bg-[var(--accent-tint)] text-[var(--accent)] font-semibold">
                      {report.reportDate}
                    </Badge>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    Submitted: {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Work Summary:</span>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap bg-[var(--background)] p-3 rounded-lg border border-[var(--border)]/40">
                    {report.workSummary}
                  </p>
                </div>

                {report.blockers && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-destructive">Blockers & Notes:</span>
                    <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                      {report.blockers}
                    </p>
                  </div>
                )}

                {/* Google Drive Attachments */}
                {report.attachments && report.attachments.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border)]/40">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                      <HardDrive className="size-3.5 text-[var(--accent)]" />
                      Google Drive Attachments ({report.attachments.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {report.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.file_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--background)] text-xs font-semibold text-[var(--accent)] border border-[var(--border)]/60 hover:bg-[var(--accent-tint)]/40 transition-colors"
                        >
                          {att.file_name}
                          <ExternalLink className="size-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
