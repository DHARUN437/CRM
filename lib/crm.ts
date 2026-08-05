export type LeadStage = "new" | "qualified" | "proposal" | "negotiation" | "won"

export const leadStages: { id: LeadStage; label: string; accent: string }[] = [
  { id: "new", label: "New Leads", accent: "oklch(0.68 0.02 265)" },
  { id: "qualified", label: "Qualified", accent: "oklch(0.7 0.14 233)" },
  { id: "proposal", label: "Proposal Sent", accent: "oklch(0.62 0.2 274)" },
  { id: "negotiation", label: "Negotiation", accent: "oklch(0.78 0.15 75)" },
  { id: "won", label: "Won", accent: "oklch(0.72 0.17 150)" },
]

export interface Lead {
  id: string
  company: string
  contact: string
  initials: string
  color: string
  value: number
  stage: LeadStage
  score: number
  source: string | null
  owner: string | null
  updated_at: string
  tags: string[]
}

export function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

export function relativeTime(iso: string) {
  const then = new Date(iso).getTime()
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const AVATAR_COLORS = [
  "oklch(0.62 0.2 274)",
  "oklch(0.62 0.22 300)",
  "oklch(0.7 0.14 233)",
  "oklch(0.72 0.17 150)",
  "oklch(0.78 0.15 75)",
  "oklch(0.68 0.2 25)",
]

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export function avatarColor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
