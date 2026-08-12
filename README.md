# TestPilot AI

Production-grade AI-assisted automated testing platform.

## Architecture

Monorepo (pnpm + Turborepo):

| Path | Role |
|------|------|
| `apps/web` | Next.js dashboard |
| `apps/api` | Fastify REST API + OpenAPI |
| `apps/worker` | BullMQ worker (AI, compile, Playwright, triage) |
| `apps/demo-sut` | Local system under test |
| `packages/domain` | Domain entities, state machines, policies |
| `packages/database` | Prisma schema, migrations, seed |
| `packages/contracts` | Shared Zod schemas / API contracts |
| `packages/ai-core` | Provider-independent AI ops |
| `packages/test-ir` | Safe TestIntent intermediate representation |
| `packages/test-compiler` | Deterministic TestIntent → Playwright compiler |
| `packages/test-runtime` | Playwright fixtures & reporters |
| `packages/security` | Encryption, SSRF, redaction, auth helpers |
| `packages/ui` | Shared UI components & design tokens |

## Prerequisites

- Node.js 22 LTS
- pnpm 10+
- Docker + Docker Compose

## Quick start

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Services:

- Web: http://localhost:3000
- API: http://localhost:3001
- API docs: http://localhost:3001/docs
- Demo SUT: http://localhost:3002
- MinIO console: http://localhost:9001

### Local credentials (seeded)

- Email: `qa@testpilot.local`
- Password: `TestPilot1!`

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm verify
```

## Demo flow

1. Sign in with seeded credentials.
2. Open **Demo Shop** project.
3. Review requirements and generate a test plan (Mock AI).
4. Approve a generated test case.
5. Compile to Playwright and start a run against demo-sut.
6. Watch live execution, open artifacts, triage failures, review healing proposals.

## Documentation

- [Architecture decisions](docs/adr/)
- [Threat model](docs/security/THREAT_MODEL.md)
- [AI safety](docs/security/AI_SAFETY.md)
- [TestIntent schema](docs/TEST_INTENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Non-goals (v1)

Native mobile automation, load testing, autonomous production testing, and third-party issue-tracker integrations are out of scope.
