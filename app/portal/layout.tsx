import { PortalHeader } from "@/components/portal/portal-header"
import { getActiveClient } from "@/lib/supabase/portal"
import { createClient } from "@/lib/supabase/server"
import { getPendingRequestCount } from "@/lib/notifications"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)

  const pendingRequestCount = client
    ? await getPendingRequestCount(client.id)
    : 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PortalHeader
        clientId={client?.id ?? null}
        pendingRequestCount={pendingRequestCount}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-foreground/10 py-4">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground sm:px-6">
          JoyCRM Client Portal — Joy Corporate Solutions secure document sharing.
        </p>
      </footer>
    </div>
  )
}
