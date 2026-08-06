"use client"

import { createClient } from "@/lib/supabase/client"
import { optimizeFileForUpload, CDN_UPLOAD_OPTIONS } from "@/lib/media-optimization"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useRef, useState } from "react"
import { Loader2, Paperclip, Send, FileText, X, MessageSquareText } from "lucide-react"
import type { ProjectMessage } from "@/lib/portal-types"
import { cn } from "@/lib/utils"
import { formatMessageTime, formatBytes, initials } from "@/lib/portal-types"
import { Badge } from "@/components/ui/badge"

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
      const { file: optimizedFile } = await optimizeFileForUpload(pendingFile)
      const safeName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = `${projectId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, optimizedFile, {
          ...CDN_UPLOAD_OPTIONS,
          contentType: optimizedFile.type || undefined,
        })

      if (uploadError) {
        console.error("Failed to upload attachment:", uploadError.message)
        setSending(false)
        return
      }

      attachmentUrl = path
      attachmentName = optimizedFile.name
      attachmentType = optimizedFile.type
      attachmentSize = optimizedFile.size
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
    <div className="flex flex-col overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm backdrop-blur-xl">
      <div className="flex max-h-[420px] min-h-[360px] flex-col gap-4 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-foreground/10">
        {!messages.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2 ring-8 ring-primary/5">
              <MessageSquareText className="size-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No messages yet
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Say hello and kick off the conversation with your team.
            </p>
          </div>
        ) : (
          messages.map((message, idx) => {
            const mine = message.sender_id === currentUserId
            const showAvatar = idx === 0 || messages[idx - 1].sender_id !== message.sender_id

            return (
              <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    mine ? "flex-row-reverse" : "flex-row",
                    !showAvatar && "mt-[-12px]"
                  )}
                >
                  {showAvatar ? (
                    <div className="flex shrink-0 size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-[11px] font-bold text-primary ring-2 ring-background">
                      {initials(message.sender_name)}
                    </div>
                  ) : (
                    <div className="size-8 shrink-0" /> // Spacer
                  )}
                  
                  <div className={cn("flex flex-col gap-1 max-w-[88%] sm:max-w-[75%]", mine ? "items-end" : "items-start")}>
                    {showAvatar && (
                      <span className="px-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-0.5">
                        {mine ? "You" : message.sender_name ?? "Unknown"}
                        {message.sender_role === "client" && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded bg-background/50">Client</Badge>}
                        {message.sender_role === "team" && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded bg-primary/10 text-primary border-primary/20">Admin</Badge>}
                        {message.sender_role === "worker" && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded bg-secondary/10 text-secondary border-secondary/20">Worker</Badge>}
                        <span className="opacity-50">· {formatMessageTime(message.created_at)}</span>
                      </span>
                    )}

                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm shadow-sm max-w-full break-words",
                        mine
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm bg-[#1E1E28] border border-[#2A2A38] text-foreground"
                      )}
                    >
                      {message.body && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
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
                  </div>
                </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border/50 bg-muted/20 p-4 backdrop-blur-md">
        {pendingFile && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-xs shadow-sm">
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="truncate font-medium">{pendingFile.name}</span>
            <span className="shrink-0 text-muted-foreground">
              {formatBytes(pendingFile.size)}
            </span>
            <button
              onClick={() => setPendingFile(null)}
              className="ml-auto shrink-0 flex items-center justify-center size-6 rounded-full bg-foreground/5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-3 bg-muted/30 rounded-2xl border border-border/50 p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
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
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl h-10 w-10 mb-0.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-5" />
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
            className="min-h-[44px] max-h-32 flex-1 resize-none border-0 bg-transparent px-2 py-3 text-sm focus-visible:ring-0 shadow-none"
            rows={1}
          />
          <Button
            onClick={send}
            disabled={(!draft.trim() && !pendingFile) || sending}
            size="icon"
            className="shrink-0 rounded-xl h-10 w-10 mb-0.5 shadow-sm transition-transform active:scale-95"
          >
            {sending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5 ml-0.5" />
            )}
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