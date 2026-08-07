import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { getGoogleDriveStatus } from "@/lib/google-drive"
import { GoogleDriveCard } from "@/components/settings/google-drive-card"
import { ChangePasswordCard } from "@/components/settings/change-password-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, ShieldCheck, Mail, Lock } from "lucide-react"

export const dynamic = "force-dynamic"

interface SettingsPageProps {
  searchParams: Promise<{
    success?: string
    error?: string
  }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const resolvedSearchParams = await searchParams
  const isAdmin = user.role === "team"
  const isTL = user.role === "tl"
  const isWorker = user.role === "worker"

  const driveStatus = isAdmin ? await getGoogleDriveStatus() : null

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Account Settings
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage your personal account profile, security credentials, and integration settings.
        </p>
      </div>

      {/* Account Overview (Read-Only) */}
      <Card className="bg-[var(--surface)] border border-[var(--border)]/60 shadow-sm rounded-2xl">
        <CardHeader className="p-6 border-b border-[var(--border)]/40">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <User className="size-5 text-[var(--accent)]" />
            Account Overview
          </CardTitle>
          <CardDescription className="text-xs text-[var(--text-secondary)]">
            Your personal profile details and agency system role.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{user.name || "User"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</span>
            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{user.email}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">System Role</span>
            <div>
              <Badge variant={isAdmin ? "secondary" : isTL ? "default" : "outline"}>
                {isAdmin ? "Agency Admin" : isTL ? "Team Lead" : "Worker"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security: Change Password */}
      <ChangePasswordCard />

      {/* Admin Integrations (Google Drive) */}
      {isAdmin && (
        <GoogleDriveCard
          initialStatus={driveStatus!}
          searchParamsSuccess={resolvedSearchParams.success}
          searchParamsError={resolvedSearchParams.error}
        />
      )}
    </div>
  )
}
