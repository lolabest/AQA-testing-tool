"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Badge, Button, EmptyState, Spinner, Table } from "@testpilot/ui";

import { api, unwrapList, unwrapObject } from "@/lib/api";

export type Entity = Record<string, unknown>;

export function text(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return fallback;
}

export function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function dateText(value: unknown): string {
  if (typeof value !== "string" && !(value instanceof Date)) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function titleize(value: unknown): string {
  return text(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function statusTone(
  status: unknown,
): "neutral" | "success" | "danger" | "warning" | "info" {
  const value = text(status, "").toUpperCase();
  if (
    ["PASSED", "COMPLETED", "APPROVED", "ACTIVE", "COVERED_PASSING", "APPLIED"].includes(
      value,
    )
  ) {
    return "success";
  }
  if (
    ["FAILED", "REJECTED", "CRITICAL", "TIMED_OUT", "CANCELLED", "BLOCKED"].includes(
      value,
    )
  ) {
    return "danger";
  }
  if (
    ["FLAKY", "PENDING", "DRAFT", "QUEUED", "HIGH", "TRIAGING"].includes(value)
  ) {
    return "warning";
  }
  if (["RUNNING", "PREPARING", "GENERATED", "VALIDATED"].includes(value)) {
    return "info";
  }
  return "neutral";
}

export function Status({ value }: { value: unknown }) {
  return <Badge tone={statusTone(value)}>{titleize(value)}</Badge>;
}

type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
};

export function useApiObject<T extends object>(path: string): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    api<unknown>(path)
      .then((payload) => {
        if (active) setData(unwrapObject<T>(payload));
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not load data.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);

  return { data, loading, error, reload };
}

export function useApiList<T>(path: string): ResourceState<T[]> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    api<unknown>(path)
      .then((payload) => {
        if (active) setData(unwrapList<T>(payload));
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not load data.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);

  return { data, loading, error, reload };
}

export function ResourceError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      <Button variant="secondary" onClick={retry}>
        Retry
      </Button>
    </div>
  );
}

export type Column<T> = {
  label: string;
  render: (item: T) => ReactNode;
};

export function ResourceTable<T>({
  data,
  columns,
  loading,
  error,
  reload,
  emptyTitle,
  emptyDescription,
  label,
}: {
  data: T[] | null;
  columns: Column<T>[];
  loading: boolean;
  error: string;
  reload: () => void;
  emptyTitle: string;
  emptyDescription: string;
  label: string;
}) {
  if (loading) return <Spinner label={`Loading ${label.toLowerCase()}…`} />;
  if (error) return <ResourceError message={error} retry={reload} />;
  if (!data?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table label={label}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.label} scope="col">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={entityKey(item, index)}>
            {columns.map((column) => (
              <td key={column.label}>{column.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function entityKey<T>(item: T, index: number): string {
  if (item && typeof item === "object" && "id" in item) {
    const id = (item as { id?: unknown }).id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return String(index);
}

export function EntityLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: unknown;
  subtitle?: unknown;
}) {
  return (
    <Link className="project-link" href={href}>
      <strong>{text(title)}</strong>
      {subtitle ? <span className="subtle">{text(subtitle)}</span> : null}
    </Link>
  );
}
