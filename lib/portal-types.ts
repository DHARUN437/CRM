export type ProjectStatus =
  | "kickoff"
  | "in_progress"
  | "in_review"
  | "on_hold"
  | "completed"

export interface ClientProfile {
  id: string
  user_id: string
  name: string
  company: string | null
  email: string
  phone: string | null
  created_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  description: string | null
  status: ProjectStatus
  progress: number
  tech_stack: string[]
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface ProjectDocument {
  id: string
  project_id: string
  client_id: string
  name: string
  file_path: string
  file_type: string
  file_size: number
  uploaded_by: string | null
  created_at: string
}

export type AppRole = "team" | "worker" | "client"

export interface TeamMember {
  id: string
  user_id: string
  role: "team" | "worker"
  name: string
  email: string
  created_at: string
}

export interface ProjectAssignment {
  id: string
  project_id: string
  team_member_id: string
  assigned_at: string
}

export interface ProjectMessage {
  id: string
  project_id: string
  sender_id: string
  body: string
  created_at: string
  sender_name?: string
  sender_role?: "team" | "worker" | "client"
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: string | null
  attachment_size?: number | null
}

export type RequestStatus = "pending" | "fulfilled"

export interface DocumentRequest {
  id: string
  project_id: string
  title: string
  description: string | null
  status: RequestStatus
  requested_at: string
  fulfilled_at: string | null
  linked_document_id: string | null
}

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "kickoff",
  "in_progress",
  "in_review",
  "on_hold",
  "completed",
]

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; badge: string; dot: string; description: string }
> = {
  kickoff: {
    label: "Kickoff",
    badge: "bg-info/15 text-info",
    dot: "bg-info",
    description: "Project just started — scoping and kickoff in progress.",
  },
  in_progress: {
    label: "In progress",
    badge: "bg-primary/15 text-primary",
    dot: "bg-primary",
    description: "The team is actively building and working on it.",
  },
  in_review: {
    label: "In review",
    badge: "bg-warning/15 text-warning",
    dot: "bg-warning",
    description: "Work is done and awaiting review and sign-off.",
  },
  on_hold: {
    label: "On hold",
    badge: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
    description: "Paused — waiting on something before it can continue.",
  },
  completed: {
    label: "Completed",
    badge: "bg-success/15 text-success",
    dot: "bg-success",
    description: "Everything has been delivered and closed out.",
  },
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// Feature requests
// ---------------------------------------------------------------------------

export type FeatureRequestStatus = "open" | "in_progress" | "completed" | "declined"
export type FeatureRequestPriority = "low" | "medium" | "high"

export const FEATURE_REQUEST_STATUS_META: Record<
  FeatureRequestStatus,
  { label: string; badge: string }
> = {
  open: { label: "Open", badge: "bg-info/15 text-info" },
  in_progress: { label: "In progress", badge: "bg-primary/15 text-primary" },
  completed: { label: "Completed", badge: "bg-success/15 text-success" },
  declined: { label: "Declined", badge: "bg-destructive/15 text-destructive" },
}

export const FEATURE_REQUEST_PRIORITY_META: Record<
  FeatureRequestPriority,
  { label: string; badge: string }
> = {
  low: { label: "Low", badge: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", badge: "bg-info/15 text-info" },
  high: { label: "High", badge: "bg-warning/15 text-warning" },
}

export interface FeatureRequest {
  id: string
  project_id: string
  client_id: string
  title: string
  description: string | null
  status: FeatureRequestStatus
  priority: FeatureRequestPriority
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Project tasks
// ---------------------------------------------------------------------------

export type TaskStatus = "todo" | "in_progress" | "review" | "done"
export type TaskPriority = "low" | "medium" | "high" | "urgent"

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; badge: string; color: string }
> = {
  todo: { label: "To do", badge: "bg-muted text-muted-foreground", color: "bg-muted-foreground" },
  in_progress: { label: "In progress", badge: "bg-primary/15 text-primary", color: "bg-primary" },
  review: { label: "Review", badge: "bg-warning/15 text-warning", color: "bg-warning" },
  done: { label: "Done", badge: "bg-success/15 text-success", color: "bg-success" },
}

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; badge: string }
> = {
  low: { label: "Low", badge: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", badge: "bg-info/15 text-info" },
  high: { label: "High", badge: "bg-warning/15 text-warning" },
  urgent: { label: "Urgent", badge: "bg-destructive/15 text-destructive" },
}

export interface ProjectTask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  assignee_name: string | null
  created_by: string | null
  due_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
}
