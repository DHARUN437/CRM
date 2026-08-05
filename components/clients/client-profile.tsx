"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ClientOverview } from "@/components/clients/client-overview"
import { ClientProjectsTab } from "@/components/clients/client-projects-tab"
import { ClientContactsTab } from "@/components/clients/client-contacts-tab"
import { ClientDocumentsTab } from "@/components/clients/client-documents-tab"
import { ClientNotesTab } from "@/components/clients/client-notes-tab"
import { ClientTimelineTab } from "@/components/clients/client-timeline-tab"
import { ClientPaymentsTab } from "@/components/clients/client-payments-tab"
import type { ClientProfile, ClientNote, ClientPaymentRow } from "@/lib/portal-types"

interface ProjectRow {
  id: string
  name: string
  description: string | null
  status: string
  progress: number
  tech_stack: string[]
  start_date: string | null
  due_date: string | null
  created_at: string
}

interface DocumentRow {
  id: string
  name: string
  file_type: string
  file_size: number
  created_at: string
  project_id?: string
  project_name?: string
  file_path?: string
}

export function ClientProfile({
  client,
  projects,
  documents,
  notes,
  payments = [],
  openTasksCount = 0,
}: {
  client: ClientProfile
  projects: ProjectRow[]
  documents: DocumentRow[]
  notes: ClientNote[]
  payments?: ClientPaymentRow[]
  openTasksCount?: number
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList variant="line">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="timeline">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ClientOverview
          client={client}
          projects={projects}
          documents={documents}
          notes={notes}
          openTasksCount={openTasksCount}
        />
      </TabsContent>

      <TabsContent value="projects">
        <ClientProjectsTab projects={projects} />
      </TabsContent>

      <TabsContent value="contacts">
        <ClientContactsTab client={client} />
      </TabsContent>

      <TabsContent value="documents">
        <ClientDocumentsTab
          clientId={client.id}
          documents={documents}
          projects={projects}
        />
      </TabsContent>

      <TabsContent value="notes">
        <ClientNotesTab clientId={client.id} notes={notes} />
      </TabsContent>

      <TabsContent value="payments">
        <ClientPaymentsTab payments={payments} />
      </TabsContent>

      <TabsContent value="timeline">
        <ClientTimelineTab
          projects={projects}
          documents={documents}
          notes={notes}
        />
      </TabsContent>
    </Tabs>
  )
}