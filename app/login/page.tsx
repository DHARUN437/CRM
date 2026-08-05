import Image from "next/image"
import { LoginForm } from "@/components/app/login-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt="JoyCRM Logo"
            width={64}
            height={64}
            className="size-16 rounded-full object-cover shadow-sm"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">JoyCRM</h1>
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
