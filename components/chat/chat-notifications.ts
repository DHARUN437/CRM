"use client"

import { useCallback, useRef, useState } from "react"

/**
 * Browser push notifications for team chat.
 *
 * "Notify once" behavior: each channel may push at most one notification until
 * the user reads that channel again (clearNotified is called when the channel
 * is opened / marked read), so a burst of messages produces one notification
 * instead of one per message.
 */
export function useChatPushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | null>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission
    }
    return null
  })
  const notifiedRef = useRef<Set<string>>(new Set())

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return
    if (Notification.permission === "granted") {
      setPermission("granted")
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
  }, [])

  const clearNotified = useCallback((channelKey: string) => {
    notifiedRef.current.delete(channelKey)
  }, [])

  const notifyNewMessage = useCallback(
    (channelKey: string, title: string, body: string, shouldNotify: boolean) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return
      if (!shouldNotify) return
      if (notifiedRef.current.has(channelKey)) return
      notifiedRef.current.add(channelKey)
      try {
        new Notification(title, { body, tag: channelKey })
      } catch {
        // Notification constructors can throw on some platforms; ignore.
      }
    },
    []
  )

  return { permission, requestPermission, clearNotified, notifyNewMessage }
}
