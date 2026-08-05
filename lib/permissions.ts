import type { AppRole } from "@/lib/portal-types"

/**
 * Central permission map. If roles change later, update this file only.
 */
const PERMISSIONS: Record<AppRole, readonly string[]> = {
  team: ["*"],
  tl: ["clients.view", "projects.view", "team.view"],
  worker: ["clients.view", "projects.view"],
  client: [],
}

export function hasPermission(
  role: AppRole | null | undefined,
  permission: string
): boolean {
  if (!role) return false
  const granted = PERMISSIONS[role] ?? []
  return granted.includes("*") || granted.includes(permission)
}

export function requireRole(
  role: AppRole | null | undefined,
  allowed: readonly AppRole[]
): boolean {
  return !!role && allowed.includes(role)
}
