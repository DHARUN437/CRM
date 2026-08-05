/**
 * AgencyOS — apply all database migrations in order.
 *
 * Uses the Supabase Management API (requires a personal access token).
 *   1. Create a token: https://supabase.com/dashboard/account/tokens
 *   2. Add it to .env.local as SUPABASE_ACCESS_TOKEN
 *
 * Usage:
 *   npm run db:migrate
 *
 * Migrations are tracked in public.schema_migrations so already-applied
 * files are skipped and every file is safe to run multiple times.
 */
import { existsSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const sqlDir = join(here, "..", "supabase")

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!url || !token) {
  console.error(
    "Missing Supabase credentials. Add to .env.local:\n" +
      "   NEXT_PUBLIC_SUPABASE_URL\n" +
      "   SUPABASE_ACCESS_TOKEN  (https://supabase.com/dashboard/account/tokens)\n" +
      "   (Project Settings → API for the project ref in the URL)"
  )
  process.exit(1)
}

const projectRef = new URL(url).hostname.split(".")[0]
const api = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

const MIGRATIONS = [
  "schema.sql",
  "roles.sql",
  "close-auth.sql",
  "document-requests-enhance.sql",
  "tasks-and-requests.sql",
  "leads.sql",
  "invoices.sql",
  "invoices-payments.sql",
  "invoice-payment-methods.sql",
  "time-tracking.sql",
  "notifications.sql",
  "client-notes.sql",
  "realtime-chat.sql",
  "request-notifications.sql",
  "chat-attachments.sql",
  "repair.sql",
  "fix-rls-recursion.sql",
  "feature-requests-fix.sql",
  "team-chat.sql",
  "team-chat-reads.sql",
]

async function run(sql) {
  const res = await fetch(api, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      body?.message || body?.error || body?.hint || `HTTP ${res.status}`
    throw new Error(message)
  }
  return body
}

async function main() {
  console.log(`🐘 Applying migrations to project ${projectRef}...\n`)

  await run(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `)

  const applied = await run(
    'select name from public.schema_migrations'
  )
  const done = new Set((Array.isArray(applied) ? applied : []).map((r) => r.name))

  const files = MIGRATIONS.filter((name) => {
    if (!existsSync(join(sqlDir, name))) {
      console.warn(`⚠️  Skipping missing file: ${name}`)
      return false
    }
    return true
  })

  let ok = 0
  let skipped = 0

  for (const name of files) {
    if (done.has(name)) {
      console.log(`⏭️  Already applied — skipped: ${name}`)
      skipped++
      continue
    }

    const sql = readFileSync(join(sqlDir, name), "utf8")
    try {
      await run(sql)
      await run(
        `insert into public.schema_migrations (name) values ('${name}') on conflict (name) do nothing`
      )
      console.log(`✅ Applied: ${name}`)
      ok++
    } catch (err) {
      console.error(`\n❌ Failed on ${name}: ${err.message}`)
      console.error(
        "Fix the error, re-run `npm run db:migrate`, and the script will resume."
      )
      process.exit(1)
    }
  }

  console.log(
    `\n🎉 Migration run complete — ${ok} applied, ${skipped} skipped.`
  )
}

main().catch((err) => {
  console.error("\n❌ Migration run failed:", err.message)
  process.exit(1)
})
