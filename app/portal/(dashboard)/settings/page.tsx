import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { ChangePasswordCard } from "@/components/settings/change-password-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ClientPortalSettingsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/portal/login")

  // Fetch client details if client user
  const { data: client } = await supabase
    .from("clients")
    .select("name, company, email")
    .eq("user_id", user.id)
    .maybeSingle()

  const displayName = client?.name || user.name || "Client"
  const companyName = client?.company || "Client Portal"

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Portal Account Settings
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage your client profile credentials and update your security password.
        </p>
      </div>

      {/* Client Overview Card */}
      <Card className="bg-[var(--surface)] border border-[var(--border)]/60 shadow-sm rounded-2xl">
        <CardHeader className="p-6 border-b border-[var(--border)]/40">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <User className="size-5 text-[var(--accent)]" />
            Client Account Profile
          </CardTitle>
          <CardDescription className="text-xs text-[var(--text-secondary)]">
            Your client portal account information.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Client Name</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{displayName}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Company</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{companyName}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Account Email</span>
            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{user.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <ChangePasswordCard />
    </div>
  )
}
