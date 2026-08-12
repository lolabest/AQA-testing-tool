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

Platform credentials: `qa@testpilot.local` / `TestPilot1!`

If the web UI returns 500 on `/sign-in` or `/api/auth/sign-in` while the API
(`http://localhost:3001`) still authenticates, clear a corrupted Next.js cache
and restart the web app:

```bash
rm -rf apps/web/.next
pnpm --filter @testpilot/web dev
```

Do not confuse the platform login with the demo shop (SUT) on port 3002
(`user@demo.local` / `User123!`).

Cloud Agent HTTPS port previews strip Cookie headers before they reach the
app. TestPilot stores the session JWT in `sessionStorage` (`testpilot_access_token`)
and sends it as an `Authorization` bearer token through `/api/proxy`. If sign-in
appears to succeed but you bounce back to login, hard-refresh so the latest
client bundle loads, then sign in again with the seeded credentials.

## Runs stuck in QUEUED

Start the worker:

```bash
pnpm --filter @testpilot/worker dev
```

## AI provider errors locally

Set `AI_DEFAULT_PROVIDER=mock` in `.env` for offline demo.
