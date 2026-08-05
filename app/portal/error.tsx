"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Portal error caught by boundary:", error)
  }, [error])

  return (
    <Card className="my-8">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-12">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <div className="flex flex-col gap-1.5 max-w-md">
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred while loading the portal page."}
          </p>
        </div>
        <Button onClick={() => reset()} variant="outline" className="mt-2 gap-2">
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}
