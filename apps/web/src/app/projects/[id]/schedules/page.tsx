"use client";

import { AppShell } from "@/components/app-shell";
import {
  Entity,
  ResourceTable,
  Status,
  dateText,
  text,
  useApiList,
} from "@/components/data-view";
import { useParams } from "next/navigation";

export default function SchedulesPage() {
  const projectId = useParams<{ id: string }>().id;
  const schedules = useApiList<Entity>(`/projects/${projectId}/schedules`);

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Automation</p>
          <h1>Schedules</h1>
          <p className="lede">Recurring suite runs and their next execution window.</p>
        </div>
      </header>
      <ResourceTable
        {...schedules}
        label="Schedules"
        emptyTitle="No schedules"
        emptyDescription="Recurring runs will appear after a schedule is configured."
        columns={[
          { label: "Name", render: (item) => <strong>{text(item.name)}</strong> },
          { label: "Status", render: (item) => <Status value={item.enabled ? "ACTIVE" : "DISABLED"} /> },
          { label: "Cron", render: (item) => <span className="mono">{text(item.cron)}</span> },
          { label: "Timezone", render: (item) => text(item.timezone, "UTC") },
          { label: "Next run", render: (item) => dateText(item.nextRunAt) },
        ]}
      />
    </AppShell>
  );
}
