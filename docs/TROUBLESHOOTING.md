# Troubleshooting

## `docker compose` fails with overlay mount errors

Some nested container environments cannot run Docker overlay snapshots. Alternatives:

1. Run Postgres and Redis via apt packages locally.
2. Point `DATABASE_URL` / `REDIS_URL` at managed services.
3. Use a host with full Docker support.

## Prisma generate / engine download blocked

```bash
pnpm rebuild prisma @prisma/client
pnpm --filter @testpilot/database generate
```

## Playwright browsers missing

```bash
pnpm --filter @testpilot/worker exec playwright install chromium
```

## MinIO bucket missing

```bash
docker compose up -d minio minio-init
```

Or create bucket `testpilot-artifacts` manually.

## Demo login fails

Ensure seed ran:

```bash
pnpm db:seed
```

Credentials: `qa@testpilot.local` / `TestPilot1!`

## Runs stuck in QUEUED

Start the worker:

```bash
pnpm --filter @testpilot/worker dev
```

## AI provider errors locally

Set `AI_DEFAULT_PROVIDER=mock` in `.env` for offline demo.
