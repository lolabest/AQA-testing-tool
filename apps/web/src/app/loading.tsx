import { Spinner } from "@testpilot/ui";

export default function Loading() {
  return (
    <div className="page">
      <Spinner label="Loading TestPilot data…" />
    </div>
  );
}
