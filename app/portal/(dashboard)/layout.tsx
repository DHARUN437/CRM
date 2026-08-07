import { PortalHeader } from "@/components/portal/portal-header"
import { PortalShell } from "@/components/portal/portal-shell"
import { getActiveClient, getPendingRequestCount } from "@/lib/supabase/portal"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { AppBackground } from "@/components/ui/app-background"
import { MobileBottomNav } from "@/components/portal/mobile-bottom-nav"
import { PortalRealtimeSync } from "@/components/portal/portal-live"

const CommandPalette = dynamic(() =>
  import("@/components/portal/command-palette").then((m) => m.CommandPalette)
)

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/portal/login")
  if (user.role !== "client") redirect("/dashboard")

  const client = await getActiveClient(supabase)

  const pendingRequestCount = client
    ? await getPendingRequestCount(supabase, client.id)
    : 0

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <AppBackground />
      <PortalRealtimeSync />
      <PortalShell>
        <PortalHeader
          clientId={client?.id ?? null}
          pendingRequestCount={pendingRequestCount}
        />
        <main className="mx-auto w-full max-w-[1700px] flex-1 px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-border/40 py-6 mb-20 sm:mb-0">
          <p className="mx-auto max-w-[1700px] px-4 text-center text-xs font-medium text-muted-foreground/60 sm:px-8">
            JoyCRM Client Portal — Joy Corporate Solutions secure document sharing.
          </p>
        </footer>
        <MobileBottomNav clientId={client?.id ?? null} pendingRequestCount={pendingRequestCount} />
        <CommandPalette />
      </PortalShell>
    </div>
  )
}
