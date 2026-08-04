"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useRef, useState } from "react"
import { Loader2, Paperclip, Send, FileText, X } from "lucide-react"
import type { ProjectMessage } from "@/lib/portal-types"
import { cn } from "@/lib/utils"
import { formatMessageTime, formatBytes } from "@/lib/portal-types"

interface ChatThreadProps {
  projectId: string
  messages: ProjectMessage[]
  currentUserId: string
  currentName: string
  currentRole: "team" | "worker" | "client"
}

interface SenderInfo {
  name: string
  role: string
}

const senderCache = new Map<string, SenderInfo>()

export function ChatThread({
  projectId,
  messages: initialMessages,
  currentUserId,
  currentName,
  currentRole,
}: ChatThreadProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length])

  useEffect(() => {
    const supabase = createClient()

    for (const m of initialMessages) {
      if (m.sender_name && m.sender_role) {
        senderCache.set(m.sender_id, {
          name: m.sender_name,
          role: m.sender_role,
        })
      }
    }

    async function resolveSender(
      senderId: string
    ): Promise<SenderInfo | null> {
      const cached = senderCache.get(senderId)
      if (cached) return cached
      const { data } = await supabase.rpc("get_sender_info", {
        p_user_id: senderId,
      })
      const row = (data ?? [])[0] as SenderInfo | undefined
      if (!row) return null
      senderCache.set(senderId, row)
      return row
    }

    const channel = supabase
      .channel(`room:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            project_id: string
            sender_id: string
            body: string
            created_at: string
            attachment_url: string | null
            attachment_name: string | null
            attachment_type: string | null
            attachment_size: number | null
          }

          const known = senderCache.get(row.sender_id)
          if (known) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev
              return [...prev, { ...row, ...known }]
            })
            return
          }

          void resolveSender(row.sender_id).then((sender) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev
              return [
                ...prev,
                {
                  ...row,
                  sender_name: sender?.name,
                  sender_role: (sender?.role ?? "team") as ProjectMessage["sender_role"],
                },
              ]
            })
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, initialMessages])

  async function send() {
    const body = draft.trim()
    if ((!body && !pendingFile) || sending) return

    setSending(true)
    const supabase = createClient()

    let attachmentUrl: string | undefined
    let attachmentName: string | undefined
    let attachmentType: string | undefined
    let attachmentSize: number | undefined

    if (pendingFile) {
      const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = `${projectId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, pendingFile, { upsert: false })

      if (uploadError) {
        console.error("Failed to upload attachment:", uploadError.message)
        setSending(false)
        return
      }

      attachmentUrl = path
      attachmentName = pendingFile.name
      attachmentType = pendingFile.type
      attachmentSize = pendingFile.size
    }

    const { data, error } = await supabase
      .from("project_messages")
      .insert({
        project_id: projectId,
        sender_id: currentUserId,
        body: body || (pendingFile ? pendingFile.name : ""),
        attachment_url: attachmentUrl ?? null,
        attachment_name: attachmentName ?? null,
        attachment_type: attachmentType ?? null,
        attachment_size: attachmentSize ?? null,
      })
      .select(
        "id, project_id, sender_id, body, created_at, attachment_url, attachment_name, attachment_type, attachment_size"
      )
      .single()

    if (error) {
      console.error("Failed to send message:", error.message)
      setSending(false)
      return
    }

    setMessages((prev) => [
      ...prev,
      {
        ...(data as ProjectMessage),
        sender_name: currentName,
        sender_role: currentRole,
      },
    ])
    setDraft("")
    setPendingFile(null)
    setSending(false)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
      <div className="flex max-h-[420px] min-h-[280px] flex-col gap-4 overflow-y-auto p-4">
        {!messages.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Send className="size-6 text-muted-foreground/40" />
            <p>
              No messages yet — say hello and kick off the conversation with
              your team.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId
            return (
              <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-1",
                    mine ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                      mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-foreground/5 text-foreground"
                    )}
                  >
                    {message.body && (
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                    )}
                    {message.attachment_url && (
                      <AttachmentPreview
                        url={message.attachment_url}
                        name={message.attachment_name}
                        type={message.attachment_type}
                        size={message.attachment_size}
                        isOwn={mine}
                      />
                    )}
                  </div>
                  <span className="px-1 text-[11px] text-muted-foreground">
                    {message.sender_name ?? "Unknown"}{" "}
                    {message.sender_role === "client" && (
                      <span className="font-medium">· Client</span>
                    )}
                    {message.sender_role === "team" && (
                      <span className="font-medium">· Admin</span>
                    )}
                    {message.sender_role === "worker" && (
                      <span className="font-medium">· Worker</span>
                    )}{" "}
                    · {formatMessageTime(message.created_at)}
                  </span>
                </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-foreground/10 bg-muted/30 p-3">
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-foreground/10 bg-background px-3 py-2 text-xs">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{pendingFile.name}</span>
            <span className="shrink-0 text-muted-foreground">
              {formatBytes(pendingFile.size)}
            </span>
            <button
              onClick={() => setPendingFile(null)}
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setPendingFile(file)
              if (fileInputRef.current) fileInputRef.current.value = ""
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={
              pendingFile
                ? "Add a message (optional)…"
                : "Type a message… (Enter to send)"
            }
            className="min-h-10 max-h-32 flex-1"
            rows={1}
          />
          <Button
            onClick={send}
            disabled={(!draft.trim() && !pendingFile) || sending}
            size="sm"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

function AttachmentPreview({
  url,
  name,
  type,
  size,
  isOwn,
}: {
  url: string | null
  name: string | null | undefined
  type: string | null | undefined
  size: number | null | undefined
  isOwn: boolean
}) {
  if (!url) return null
  const isImage = type?.startsWith("image/")

  if (isImage) {
    return (
      <a
        href={`https://${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace("https://", "")}/storage/v1/object/authenticated/chat-attachments/${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace("https://", "")}/storage/v1/object/authenticated/chat-attachments/${url}`}
          alt={name ?? "Image"}
          className="max-h-48 rounded-lg object-cover"
        />
      </a>
    )
  }

  return (
    <a
      href={`https://${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace("https://", "")}/storage/v1/object/authenticated/chat-attachments/${url}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:opacity-80",
        isOwn
          ? "border-primary-foreground/20 bg-primary-foreground/10"
          : "border-foreground/10 bg-foreground/5"
      )}
    >
      <FileText className="size-4 shrink-0" />
      <span className="truncate">{name ?? "File"}</span>
      {size != null && (
        <span className="shrink-0 opacity-70">{formatBytes(size)}</span>
      )}
    </a>
  )
}