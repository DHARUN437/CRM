"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, HardDrive, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react"
import { type GoogleDriveStatus } from "@/lib/google-drive"

interface GoogleDriveCardProps {
  initialStatus: GoogleDriveStatus
  searchParamsError?: string
  searchParamsSuccess?: string
}

export function GoogleDriveCard({
  initialStatus,
  searchParamsError,
  searchParamsSuccess,
}: GoogleDriveCardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<GoogleDriveStatus>(initialStatus)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testingUpload, setTestingUpload] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error"
    text: string
    fileUrl?: string
  } | null>(
    searchParamsError
      ? { type: "error", text: `Connection error: ${searchParamsError}` }
      : searchParamsSuccess
      ? { type: "success", text: "Google Drive account connected successfully!" }
      : null
  )

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect Google Drive?")) return
    setDisconnecting(true)
    setUploadMessage(null)

    try {
      const res = await fetch("/api/google-drive/disconnect", { method: "POST" })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to disconnect.")

      setStatus({ isConnected: false, folderIdConfigured: status.folderIdConfigured })
      setUploadMessage({ type: "success", text: "Google Drive has been disconnected." })
      router.refresh()
    } catch (err) {
      setUploadMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to disconnect." })
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleTestUpload() {
    setTestingUpload(true)
    setUploadMessage(null)

    try {
      const res = await fetch("/api/google-drive/test-upload", { method: "POST" })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Test upload failed.")

      setUploadMessage({
        type: "success",
        text: `Success! Test file "${data.fileName}" uploaded to Google Drive.`,
        fileUrl: data.webViewLink,
      })
    } catch (err) {
      setUploadMessage({ type: "error", text: err instanceof Error ? err.message : "Google Drive test upload failed." })
    } finally {
      setTestingUpload(false)
    }
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)]/60 rounded-xl p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-tint)] text-[var(--accent)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
              Google Drive Integration
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              Connect a shared Google Drive account to enable automated file & report uploads.
            </p>
          </div>
        </div>

        {status.isConnected && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connected
          </span>
        )}
      </div>

      {uploadMessage && (
        <div
          className={`mb-5 p-4 rounded-xl text-xs flex items-start gap-2.5 ${
            uploadMessage.type === "success"
              ? "bg-[#DCFCE7]/60 text-[#15803D] border border-[#15803D]/20"
              : "bg-[#FEE2E2]/60 text-[#B91C1C] border border-[#B91C1C]/20"
          }`}
        >
          {uploadMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium">{uploadMessage.text}</p>
            {uploadMessage.fileUrl && (
              <a
                href={uploadMessage.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline mt-1"
              >
                View uploaded file on Google Drive <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {status.isConnected ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-[var(--text-secondary)] font-medium">Authorized Account</p>
              <p className="text-[var(--text-primary)] font-semibold text-sm mt-0.5">
                Connected as <span className="text-[var(--accent)]">{status.email}</span>
              </p>
              {status.connectedAt && (
                <p className="text-[var(--text-muted)] text-[11px] mt-1">
                  Connected on {new Date(status.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestUpload}
                disabled={testingUpload}
                className="text-xs font-semibold rounded-lg border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface)]"
              >
                {testingUpload ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                Test Upload
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs font-semibold rounded-lg text-[#B91C1C] hover:bg-[#FEE2E2]/60 hover:text-[#B91C1C]"
              >
                {disconnecting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]/60">
          <div className="text-xs">
            <p className="font-semibold text-[var(--text-primary)]">Google Drive Authorization Required</p>
            <p className="text-[var(--text-secondary)] mt-0.5">
              Click below to sign in with Google and grant upload permissions to your target folder.
            </p>
          </div>

          <a href="/api/google-drive/connect">
            <Button
              size="sm"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-2"
            >
              <HardDrive className="w-4 h-4" />
              Connect Google Drive
            </Button>
          </a>
        </div>
      )}
    </div>
  )
}
