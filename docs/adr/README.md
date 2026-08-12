# Architecture Decision Records

## ADR-001: Safe TestIntent intermediate representation

Status: Accepted

AI must not emit arbitrary executable code for automatic execution. Instead AI emits a versioned `TestIntent` document validated by Zod. A deterministic compiler produces Playwright TypeScript. This preserves auditability, reproducibility, and safety.

## ADR-002: Provider-native AI adapters

Status: Accepted

Each AI vendor is integrated via its official SDK (Responses / Messages / Gemini). An OpenAI-compatible adapter exists for enterprise gateways. A MockAiProvider enables fully offline demos and CI.

## ADR-003: Human-approved self-healing

Status: Accepted

Locator/route healings create `HealingProposal` records. Auto-apply requires human approval plus deterministic validation. Business assertions and security checks are never auto-modified.

## ADR-004: Workspace-scoped multi-tenancy

Status: Accepted

Every query is constrained by workspace membership. Frontend hiding is not authorization. Backend RBAC and tenant isolation are covered by automated tests.

## ADR-005: Artifact storage in S3-compatible object storage

Status: Accepted

Traces, videos, screenshots, and reports are stored in MinIO locally and any S3-compatible store in production. Metadata lives in PostgreSQL; binaries do not.
