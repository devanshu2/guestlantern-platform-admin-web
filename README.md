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
npm run dev:mocked
```

Default app URL: `http://127.0.0.1:3000`

The development profile expects the Dockerized backend on `http://127.0.0.1:18080`:

```sh
npm run backend:docker:platform:up
npm run dev
```

Override the web port without changing scripts:

```sh
PLATFORM_ADMIN_WEB_PORT=3200 npm run dev:mocked
PORT=3201 npm run dev
```

## Runtime Profiles

| Profile       | Script               | Backend                                          | Logging |
| ------------- | -------------------- | ------------------------------------------------ | ------- |
| `mocked`      | `npm run dev:mocked` | Built-in current-contract mock                   | `debug` |
| `development` | `npm run dev`        | Docker/local backend at `http://127.0.0.1:18080` | `debug` |
| `production`  | `npm run start`      | Configured production API URL                    | `info`  |

Profile files live in `env/`. Production deployments should override `env/production.env` values through the deployment environment or secret manager.

## Docker Workflows

Docker support mirrors the same runtime profiles without replacing the npm workflows.

Mocked hot-reload frontend only:

```sh
npm run docker:mocked
```

Real-backend hot-reload frontend. This starts the Dockerized `platform-admin-api` stack first, then
runs the web container on the shared backend network:

```sh
npm run docker:development
```

Production-like local container. This builds the optimized standalone Next.js image, starts the real
Docker backend, and runs the frontend against `http://platform-admin-api:8080`:

```sh
npm run docker:production
```

Build the production image without starting it:

```sh
npm run docker:build
```

Stop and remove frontend Docker services:

```sh
npm run docker:down
```

All Docker modes publish the app on `http://127.0.0.1:3000` by default. Override the host port with:

```sh
PLATFORM_ADMIN_DOCKER_WEB_PORT=3200 npm run docker:mocked
```

The real-backend Docker modes join `guestlantern-backend_default` by default. Override that network
with `PLATFORM_ADMIN_BACKEND_NETWORK` if the backend compose project name changes.

## Environment Variables

| Variable                            | Default              | Purpose                                                                          |
| ----------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `PLATFORM_ADMIN_ENVIRONMENT`        | `development`        | Runtime profile: `development`, `production`, or `mocked`.                       |
| `PLATFORM_ADMIN_LOG_LEVEL`          | profile-dependent    | Server-side structured log level: `debug`, `info`, `warn`, `error`, or `silent`. |
| `PLATFORM_ADMIN_WEB_HOSTNAME`       | `127.0.0.1`          | Host passed to `next dev`/`next start` by profile scripts.                       |
| `PLATFORM_ADMIN_WEB_PORT` / `PORT`  | `3000`               | Configurable web port. `PORT` is honored as a fallback.                          |
| `PLATFORM_ADMIN_API_BASE_URL`       | profile-dependent    | Server-side backend base URL.                                                    |
| `PLATFORM_ADMIN_API_MODE`           | `real`               | `real` or `mock`; `mock` enables the current-contract mock adapter.              |
| `PLATFORM_ADMIN_API_MOCK`           | `0`                  | Backward-compatible boolean mock switch.                                         |
| `PLATFORM_ADMIN_COOKIE_SECURE`      | production-dependent | Set secure cookie flag explicitly for local HTTPS/proxy setups.                  |
| `PLATFORM_ADMIN_COOKIE_DOMAIN`      | unset                | Optional shared cookie domain.                                                   |
| `PLATFORM_ADMIN_REQUEST_TIMEOUT_MS` | `15000`              | Backend request timeout.                                                         |
| `PLATFORM_ADMIN_DEFAULT_PAGE_SIZE`  | `25`                 | Default server-side page size.                                                   |
| `NEXT_PUBLIC_JOB_POLL_INTERVAL_MS`  | `5000`               | Browser polling interval for active jobs.                                        |

## Verification

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run test:e2e:mocked
npm run test:e2e:backend
```

`npm run test:e2e:backend` starts the Dockerized platform-admin-api through `../backend/compose.yml`, waits for `/health/ready`, then runs a real browser provisioning/audit/logout smoke through the BFF.

By default, the Docker helper reuses the existing `guestlantern-backend-local` image. Set `PLATFORM_ADMIN_BACKEND_DOCKER_BUILD=1` when you need to force a backend image rebuild.

For backend API-only verification, run the backend smoke gate:

```sh
cd ../backend
make smoke-platform-admin-api
```

## Security Notes

- Access and refresh tokens are stored only in secure httpOnly cookies.
- Browser code never reads or writes platform bearer tokens.
- Mutating BFF routes require a double-submit CSRF token.
- The app branches on backend `error.code` and renders backend `error.message`.
- Security headers are configured in `next.config.ts`.
