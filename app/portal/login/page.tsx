import { PortalLoginForm } from "@/components/portal/login-form"

export const dynamic = "force-dynamic"

export default async function PortalLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <span className="text-xl font-bold">A</span>
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">
              AgencyOS Client Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to view your projects, your team and share documents.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/10 p-6 shadow-sm">
          <PortalLoginForm />
        </div>
      </div>
    </div>
  )
}
