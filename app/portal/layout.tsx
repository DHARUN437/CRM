import { PortalHeader } from "@/components/portal/portal-header"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PortalHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-foreground/10 py-4">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground sm:px-6">
          AgencyOS Client Portal — secure document sharing with your project team.
        </p>
      </footer>
    </div>
  )
}
