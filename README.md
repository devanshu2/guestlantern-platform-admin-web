# GuestLantern Platform Admin Web

Next.js App Router operator console for the GuestLantern `platform-admin-api`.

## What This App Covers

- Platform admin login, refresh, bootstrap, and logout through a server-side BFF.
- Dashboard with backend readiness, runtime counters, recent provisioning jobs, and direct restaurant UUID lookup.
- Restaurant provisioning form backed by `POST /platform/restaurants/provision`.
- Provisioning job list, detail, step timeline, audit timeline, and operator actions.
- Restaurant operational summary, domain creation, database/auth config repair, and infra prepare.
- Scoped provisioning audit search.

Tenant lifecycle operations such as backup, disable, re-enable, and permanent delete are visible as backend-blocked scope only. They are not implemented as callable UI because the current OpenAPI contract does not expose those routes.

## Backend Contract

Source of truth: `../backend/docs/openapi/platform-admin-api.json`

Planning docs used:

- `../backend/docs/platform-admin-api/overview.md`
- `../backend/docs/platform-admin-api/auth.md`
- `../backend/docs/platform-admin-api/provisioning.md`
- `../backend/docs/platform-admin-api/ops.md`
- `../backend/docs/frontend-planning/backend-api-readiness.md`

## Local Setup

```sh
npm install
npm run dev
```

Default app URL: `http://localhost:3000`

Default backend URL: `http://127.0.0.1:8080`

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PLATFORM_ADMIN_API_BASE_URL` | `http://127.0.0.1:8080` | Server-side backend base URL. |
| `PLATFORM_ADMIN_API_MOCK` | `0` | Set to `1` for current-contract mock backend in tests/dev. |
| `PLATFORM_ADMIN_COOKIE_SECURE` | production-dependent | Set secure cookie flag explicitly for local HTTPS/proxy setups. |
| `PLATFORM_ADMIN_COOKIE_DOMAIN` | unset | Optional shared cookie domain. |
| `PLATFORM_ADMIN_REQUEST_TIMEOUT_MS` | `15000` | Backend request timeout. |
| `PLATFORM_ADMIN_DEFAULT_PAGE_SIZE` | `25` | Default server-side page size. |
| `NEXT_PUBLIC_JOB_POLL_INTERVAL_MS` | `5000` | Browser polling interval for active jobs. |

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

For backend-assisted verification, start the platform admin API first from `../backend` and run its smoke gate:

```sh
make smoke-platform-admin-api
```

Then run the web app without mock mode and exercise login, provisioning, jobs, summaries, and audit.

## Security Notes

- Access and refresh tokens are stored only in secure httpOnly cookies.
- Browser code never reads or writes platform bearer tokens.
- Mutating BFF routes require a double-submit CSRF token.
- The app branches on backend `error.code` and renders backend `error.message`.
- Security headers are configured in `next.config.ts`.
