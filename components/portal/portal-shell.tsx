"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function PortalShell({ children }: { children: React.ReactNode }) {
  const [isBooting] = useState(() => {
    if (typeof sessionStorage === "undefined") return false
    return !!sessionStorage.getItem("auth-booted")
  })

  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("auth-booted")
    }
  }, [])

  return (
    <motion.div
      initial={isBooting ? { opacity: 0, y: 30, filter: "blur(10px)" } : false}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: "easeOut", delay: isBooting ? 0.2 : 0 }}
      className="flex flex-col min-h-screen w-full"
    >
      {children}
    </motion.div>
  )
}
