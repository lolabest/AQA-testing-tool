import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@testpilot/ui";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AppShell>
      <header className="page-header">
        <div>
          <h1>{title}</h1>
        </div>
      </header>
      <EmptyState title={title} description={description} />
    </AppShell>
  );
}
