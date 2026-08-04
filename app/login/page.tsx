import { LoginForm } from "@/components/app/login-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <span className="text-xl font-bold">A</span>
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">AgencyOS</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your workspace
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/10 p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ArrowLeft className="size-3.5" />
          <Link href="/portal/login" className="hover:text-foreground">
            Are you a client? Go to the client portal
          </Link>
        </p>
      </div>
    </div>
  )
}
