"use client"

import { createClient } from "@/lib/supabase/client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Hash, FolderKanban, Loader2, Check, CheckCheck, Bell, BellOff, BellRing } from "lucide-react"
import {
  formatMessageTime,
  type TeamChannel,
  type TeamDirectoryMember,
  type TeamMessage,
} from "@/lib/portal-types"
import { useChatPushNotifications } from "@/components/chat/chat-notifications"
import { cn } from "@/lib/utils"

interface TeamChatProps {
  currentUserId: string
  members: TeamDirectoryMember[]
  projects: { id: string; name: string }[]
  initialChannelKey?: string
}

function channelKey(channel: TeamChannel): string {
  switch (channel.kind) {
    case "general":
      return "general"
    case "project":
      return `project:${channel.projectId}`
    case "dm":
      return `dm:${channel.peerId}`
  }
}

function channelTitle(channel: TeamChannel): string {
  switch (channel.kind) {
    case "general":
      return "# General"
    case "project":
      return `# ${channel.name}`
    case "dm":
      return channel.peerName
  }
}

function rowChannelKey(
  row: { channel_type: string; project_id: string | null; sender_id: string; dm_peer_id: string | null },
  currentUserId: string
): string {
  if (row.channel_type === "general") return "general"
  if (row.channel_type === "project") return `project:${row.project_id}`
  return `dm:${row.sender_id === currentUserId ? row.dm_peer_id : row.sender_id}`
}

function rowChannelTitle(
  row: { channel_type: string; project_id: string | null; sender_id: string; dm_peer_id: string | null },
  currentUserId: string,
  memberByUserId: Map<string, TeamDirectoryMember>,
  projects: { id: string; name: string }[]
): string {
  if (row.channel_type === "general") return "# General"
  if (row.channel_type === "project") {
    return `# ${projects.find((p) => p.id === row.project_id)?.name ?? "Project"}`
  }
  const peerId = row.sender_id === currentUserId ? row.dm_peer_id : row.sender_id
  return memberByUserId.get(peerId ?? "")?.name ?? "Direct message"
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function resolveChannel(
  initialChannelKey: string | undefined,
  members: TeamDirectoryMember[],
  projects: { id: string; name: string }[]
): TeamChannel {
  if (initialChannelKey === "general") return { kind: "general" }
  if (initialChannelKey?.startsWith("project:")) {
    const id = initialChannelKey.slice(8)
    const project = projects.find((p) => p.id === id)
    if (project) return { kind: "project", projectId: project.id, name: project.name }
  }
  if (initialChannelKey?.startsWith("dm:")) {
    const uid = initialChannelKey.slice(3)
    const member = members.find((m) => m.user_id === uid)
    if (member) {
      return { kind: "dm", peerId: member.user_id, peerName: member.name, peerRole: member.role }
    }
  }
  return { kind: "general" }
}

export function TeamChat({
  currentUserId,
  members,
  projects,
  initialChannelKey,
}: TeamChatProps) {
  const [active, setActive] = useState<TeamChannel>(() =>
    resolveChannel(initialChannelKey, members, projects)
  )
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { permission, requestPermission, clearNotified, notifyNewMessage } =
    useChatPushNotifications()

  const self = members.find((m) => m.user_id === currentUserId)
  const memberByUserId = useMemo(
    () => new Map(members.map((m) => [m.user_id, m])),
    [members]
  )

  const key = channelKey(active)

  const matchesChannel = useCallback(
    (row: {
      channel_type: string
      project_id: string | null
      dm_peer_id: string | null
      sender_id: string
    }, channel: TeamChannel): boolean => {
      if (channel.kind === "general") return row.channel_type === "general"
      if (channel.kind === "project")
        return row.channel_type === "project" && row.project_id === channel.projectId
      return (
        row.channel_type === "dm" &&
        ((row.sender_id === channel.peerId && row.dm_peer_id === currentUserId) ||
          (row.sender_id === currentUserId && row.dm_peer_id === channel.peerId))
      )
    },
    [currentUserId]
  )

  const enrich = useCallback(
    (rows: TeamMessage[]): TeamMessage[] => {
      return rows.map((m) => {
        const sender = memberByUserId.get(m.sender_id)
        return {
          ...m,
          sender_name: sender?.name ?? "Unknown",
          sender_role: sender?.role ?? "team",
        }
      })
    },
    [memberByUserId]
  )

  const refreshUnread = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.rpc("team_unread_counts")
    const map: Record<string, number> = {}
    for (const row of (data ?? []) as { channel_key: string; unread: number }[]) {
      map[row.channel_key] = row.unread
    }
    setUnread(map)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      let query = supabase
        .from("team_messages")
        .select("*")
        .order("created_at", { ascending: true })
      if (active.kind === "general") {
        query = query.eq("channel_type", "general")
      } else if (active.kind === "project") {
        query = query.eq("channel_type", "project").eq("project_id", active.projectId)
      } else {
        query = query
          .eq("channel_type", "dm")
          .or(
            `and(sender_id.eq.${currentUserId},dm_peer_id.eq.${active.peerId}),and(sender_id.eq.${active.peerId},dm_peer_id.eq.${currentUserId})`
          )
      }
      const { data } = await query
      if (data) setMessages(enrich(data as unknown as TeamMessage[]))
    }

    async function sync() {
      await supabase.rpc("team_messages_mark_read", { p_channel_key: key })
      clearNotified(key)
      await load()
      await refreshUnread()
    }

    void sync()

    const channel = supabase
      .channel(`team-chat:${key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_messages",
        },
        (payload) => {
          const row = payload.new as {
            channel_type: string
            project_id: string | null
            dm_peer_id: string | null
            sender_id: string
            body: string
          }
          const isForActive = matchesChannel(row, active)

          if (payload.eventType === "INSERT" && row.sender_id !== currentUserId) {
            const channelKey = rowChannelKey(row, currentUserId)
            const sender = memberByUserId.get(row.sender_id)
            const viewing =
              isForActive &&
              typeof document !== "undefined" &&
              document.visibilityState === "visible" &&
              document.hasFocus()
            notifyNewMessage(
              channelKey,
              `${sender?.name ?? "Team"} · ${rowChannelTitle(row, currentUserId, memberByUserId, projects)}`,
              row.body,
              !viewing
            )
          }

          if (isForActive) {
            void sync()
          } else {
            void refreshUnread()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [key, active, currentUserId, enrich, matchesChannel, refreshUnread, memberByUserId, projects, notifyNewMessage, clearNotified])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    const supabase = createClient()

    const payload: Record<string, string> = {
      sender_id: currentUserId,
      body,
    }
    if (active.kind === "general") {
      payload.channel_type = "general"
    } else if (active.kind === "project") {
      payload.channel_type = "project"
      payload.project_id = active.projectId
    } else {
      payload.channel_type = "dm"
      payload.dm_peer_id = active.peerId
    }

    const { data, error } = await supabase
      .from("team_messages")
      .insert(payload)
      .select()
      .single()

    if (!error && data) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id)
          ? prev
          : [
              ...prev,
              {
                ...(data as unknown as TeamMessage),
                sender_name: self?.name ?? "You",
                sender_role: self?.role ?? "team",
              },
            ]
      )
    }
    setSending(false)
    setDraft("")
  }

  const sortedMembers = [...members].sort((a, b) =>
    a.role === b.role ? a.name.localeCompare(b.name) : a.role === "team" ? -1 : 1
  )

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[420px] overflow-hidden rounded-xl border border-foreground/10 bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-foreground/10">
        <div className="flex items-center justify-between border-b border-foreground/10 px-3 py-2.5">
          <span className="text-sm font-semibold">Team Chat</span>
          <button
            type="button"
            onClick={() => {
              if (permission !== "granted" && permission !== "denied") void requestPermission()
            }}
            disabled={permission === "granted" || permission === "denied"}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 disabled:cursor-default disabled:opacity-60"
            title={
              permission === "granted"
                ? "Message notifications enabled"
                : permission === "denied"
                  ? "Notifications blocked by the browser"
                  : "Enable message notifications"
            }
            aria-label="Message notifications"
          >
            {permission === "granted" ? (
              <BellRing className="size-4 text-primary" />
            ) : permission === "denied" || permission === null ? (
              <BellOff className="size-4" />
            ) : (
              <Bell className="size-4" />
            )}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => setActive({ kind: "general" })}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
              active.kind === "general"
                ? "bg-primary/10 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            <Hash className="size-4" />
            <span className="truncate">General</span>
            {(unread.general ?? 0) > 0 && (
              <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {unread.general}
              </span>
            )}
          </button>

          <p className="px-2.5 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
            Projects
          </p>
          {projects.map((p) => {
            const isActive = active.kind === "project" && active.projectId === p.id
            return (
              <button
                key={p.id}
                onClick={() => setActive({ kind: "project", projectId: p.id, name: p.name })}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                <FolderKanban className="size-4" />
                <span className="truncate">{p.name}</span>
                {(unread[`project:${p.id}`] ?? 0) > 0 && (
                  <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unread[`project:${p.id}`]}
                  </span>
                )}
              </button>
            )
          })}

          <p className="px-2.5 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
            Direct messages
          </p>
          {sortedMembers
            .filter((m) => m.user_id !== currentUserId)
            .map((m) => {
              const isActive = active.kind === "dm" && active.peerId === m.user_id
              return (
                <button
                  key={m.user_id}
                  onClick={() =>
                    setActive({
                      kind: "dm",
                      peerId: m.user_id,
                      peerName: m.name,
                      peerRole: m.role,
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      m.role === "team"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {initials(m.name)}
                  </span>
                  <span className="truncate">{m.name}</span>
                  {(unread[`dm:${m.user_id}`] ?? 0) > 0 && (
                    <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {unread[`dm:${m.user_id}`]}
                    </span>
                  )}
                </button>
              )
            })}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {active.kind === "general" && <Hash className="size-4 text-muted-foreground" />}
            {active.kind === "project" && (
              <FolderKanban className="size-4 text-muted-foreground" />
            )}
            {channelTitle(active)}
          </div>
          {active.kind === "dm" && (
            <span className="text-xs text-muted-foreground">
              {active.peerRole === "team" ? "Admin" : active.peerRole === "tl" ? "Team Lead" : "Developer"}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!messages.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Say hello!
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === currentUserId
              const sender = memberByUserId.get(m.sender_id)
              const readBy = m.read_by ?? []
              const isRead =
                mine &&
                (active.kind === "dm"
                  ? readBy.includes(active.peerId)
                  : readBy.length > 0)
              return (
                <div key={m.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {initials(m.sender_name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[75%] flex flex-col gap-1", mine && "items-end")}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">{mine ? "You" : m.sender_name}</span>
                      <span className="text-muted-foreground/70">
                        {sender?.role === "team" ? "Admin" : sender?.role === "tl" ? "Team Lead" : "Developer"}
                      </span>
                      <span className="text-muted-foreground/60">
                        {formatMessageTime(m.created_at)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {m.body}
                      {mine && (
                        <span
                          title={isRead ? "Read" : "Sent"}
                          className={cn(
                            "ml-1 inline-flex translate-y-[2px] items-center",
                            isRead
                              ? "text-primary-foreground"
                              : "text-primary-foreground/40"
                          )}
                        >
                          {isRead ? (
                            <CheckCheck className="size-3.5" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex items-center gap-2 border-t border-foreground/10 p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${channelTitle(active)}`}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </section>
    </div>
  )
}
