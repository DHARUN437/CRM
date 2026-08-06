"use client"

import { useEffect, useState } from "react"
import { Bell, Check, Info, FileQuestion, Upload, CheckSquare, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { type NotificationItem } from "@/lib/portal-types"

const TYPE_ICONS = {
  info: Info,
  request: FileQuestion,
  upload: Upload,
  task: CheckSquare,
  chat: MessageSquare,
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function fetchNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        return data.notifications || []
      }
    } catch {
      // Ignore network errors
    }
    return []
  }

  useEffect(() => {
    let cancelled = false
    fetchNotifications().then((items) => {
      if (!cancelled) setNotifications(items)
    })

    // Enable Supabase Realtime WebSocket subscription for instant notification popups
    const supabase = createClient()
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications().then((items) => {
            if (!cancelled) setNotifications(items)
          })
        }
      )
      .subscribe()

    const interval = setInterval(() => {
      fetchNotifications().then((items) => {
        if (!cancelled) setNotifications(items)
      })
    }, 15000)

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markAllAsRead() {
    setLoading(true)
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch {
      // Ignore
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative size-9 rounded-full"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell className="size-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-2.5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-[calc(100vw-32px)] max-w-[360px] rounded-[20px] border border-border/60 dark:border-[#2A2A38] bg-popover/95 dark:bg-[#17171F]/95 p-4 shadow-layered backdrop-blur-xl text-popover-foreground animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Check className="size-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto py-2 flex flex-col gap-1">
              {!notifications.length ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((item) => {
                  const Icon = TYPE_ICONS[item.type] || Info
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!item.read) markAsRead(item.id)
                        if (item.link) {
                          setOpen(false)
                          window.location.href = item.link
                        }
                      }}
                      className={`flex items-start gap-3 rounded-lg p-2.5 text-xs transition-colors cursor-pointer ${
                        item.read
                          ? "hover:bg-muted/50 text-muted-foreground"
                          : "bg-primary/5 hover:bg-primary/10 text-foreground font-medium"
                      }`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/5 mt-0.5">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="flex flex-1 flex-col gap-0.5">
                        <p className="font-medium text-xs text-foreground">{item.title}</p>
                        <p className="line-clamp-2 text-muted-foreground">{item.message}</p>
                        <span className="text-[10px] text-muted-foreground/70 mt-1">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
