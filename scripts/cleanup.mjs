/**
 * AgencyOS Client Portal — wipe ALL demo/test data.
 *
 * Deletes every storage file, document request, document, project, client
 * profile and auth user in the project. Leaves the schema (tables, RLS,
 * policies, bucket) intact so you can assign real data manually.
 *
 * Usage:
 *   node --env-file=.env.local scripts/cleanup.mjs
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || url.includes("YOUR-")) {
  console.error("❌ Missing Supabase credentials in .env.local")
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function deleteAllObjects(bucket) {
  let removed = 0
  let offset = 0
  while (true) {
    const { data: objects, error } = await admin.storage
      .from(bucket)
      .list("", { limit: 100, offset })
    if (error) throw error
    if (!objects || objects.length === 0) break

    const names = objects
      .filter((o) => !o.id) // folders have no id
      .map((o) => `${o.name}/`) // folder paths need trailing slash
      .concat(objects.filter((o) => o.id).map((o) => o.name))
    const { error: rmError } = await admin.storage.from(bucket).remove(names)
    if (rmError) throw rmError
    removed += names.length
    offset += 100
    if (objects.length < 100) break
  }
  return removed
}

async function main() {
  console.log("🧹 Wiping all demo/test data...\n")

  // 1. Storage files
  const removedFiles = await deleteAllObjects("client-documents")
  console.log(`🗑️  Storage: removed ${removedFiles} file(s)/folder(s)`)

  // 2. Table rows (FK order: messages → assignments → requests → docs → projects → clients)
  for (const [table, label] of [
    ["project_messages", "project messages"],
    ["project_assignments", "project assignments"],
    ["team_members", "team members"],
    ["document_requests", "document requests"],
    ["project_documents", "project documents"],
    ["projects", "projects"],
    ["clients", "client profiles"],
  ]) {
    const { count, error } = await admin
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id", { count: "exact", head: true })
    if (error) {
      console.log(`⚠️  Could not clear ${label}: ${error.message}`)
    } else {
      console.log(`🗑️  Database: removed ${count ?? 0} ${label}`)
    }
  }

  // 3. Auth users (cascades any remaining client profiles)
  const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const users = page?.users ?? []
  for (const u of users) {
    await admin.auth.admin.deleteUser(u.id)
  }
  console.log(`🗑️  Auth: removed ${users.length} user(s)`)

  console.log("\n✨ Clean slate! Schema, RLS policies and the 'client-documents'")
  console.log("   bucket are untouched — create real users and data manually.")
}

main().catch((err) => {
  console.error("\n❌ Cleanup failed:", err.message)
  process.exit(1)
})
