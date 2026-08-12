# TestPilot Demo SUT

A deliberately small local store used to demonstrate TestPilot AI browser, API, role, validation, locator-healing, flakiness, and prompt-injection safety tests.

## Run locally

From the repository root:

```sh
pnpm --filter @testpilot/demo-sut dev
```

Open <http://localhost:3002>. Set `PORT` or `HOST` to override the default listener. `SESSION_SECRET` can override the local-only default signing secret.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@demo.local` | `Admin123!` |
| User | `user@demo.local` | `User123!` |
| Viewer | `viewer@demo.local` | `Viewer123!` |

The application supports signed session cookies and the bearer token returned by `POST /api/auth/login`.

## API

- `GET /health`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/products`
- `POST /api/products`
- `POST /api/checkout`
- `GET /api/flaky`

Authenticated requests can use the login cookie or `Authorization: Bearer <token>`. API checkout accepts `{"productIds":[1,2]}`; without `productIds`, it checks out the current browser cart.
