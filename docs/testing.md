# Testing

## Unit And Component Tests

```sh
npm test
```

Coverage includes:

- DTO/status helpers.
- Backend error normalization.
- CSRF checks.
- Operator input validation.
- Accessible form field labeling/helper/error wiring.

## Browser Tests

```sh
npm run test:e2e:mocked
```

Playwright starts the app with the `mocked` profile. The mock adapter implements the current platform-admin contract, including tenant infra lifecycle and step-up routes. The mocked suite runs on Chromium desktop and Pixel 7 mobile.

Browser scenarios cover:

- Login and dashboard load.
- Accessibility smoke on the dashboard with axe.
- Visual regression baselines for branded theme presets and critical operator pages.
- Provision form submission and missing-required-field blocking before the create API is called.
- Job detail and retry confirmation dialog.
- Restaurant summary, safe auth updates that preserve hidden auth fields, and infra prepare.
- Advanced repair confirmation prompts for DB target/auth identity changes, with no prompt for safe updates or connection-options-only repair.
- Scoped audit search.

Screenshot baselines live under `tests/e2e/__screenshots__/` and are keyed by Playwright project
(`chromium` and `mobile`). Update them intentionally with:

```sh
npm run test:e2e:mocked -- --update-snapshots
```

## Backend-Assisted Browser Smoke

```sh
npm run test:e2e:backend
```

This script:

1. Starts Docker infrastructure and the Dockerized `platform-admin-api` from `../backend/compose.yml`.
2. Waits for `http://127.0.0.1:18080/health/ready`.
3. Starts the Next app with the `development` profile on a configurable test port.
4. Runs a real browser flow through login, missing-field create blocking, provisioning, job detail, restaurant summary, safe auth/domain updates, advanced repair with infra prepare, audit search, and logout.

The backend-assisted suite uses a unique restaurant UUID and slug per run. It intentionally runs one Chromium project to avoid concurrent writes to local tenant infra while still exercising a real browser and the real BFF/backend contract.

The Docker helper reuses the existing `guestlantern-backend-local` image when available. Set `PLATFORM_ADMIN_BACKEND_DOCKER_BUILD=1 npm run test:e2e:backend` to force a rebuild.

Advanced repair production notes:

- Changing `db_name` points the restaurant at another database; it does not rename or migrate old data.
- If the database does not exist, infra prepare may create an empty tenant database with schema and seed data.
- Running restaurant APIs may keep old DB pools until restart or pool invalidation.
- JWT secret, issuer, audience, or signing algorithm repairs can invalidate sessions or break tenant clients; treat these as maintenance-window operations.

## Docker Browser Smoke

The frontend can also run in Docker:

```sh
npm run docker:mocked
npm run docker:development
npm run docker:production
```

Use `npm run docker:down` to stop frontend containers. The development and production Docker
profiles reuse the real backend Docker stack and proxy health through `/api/health/ready`.
