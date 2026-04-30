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

Playwright starts the app with the `mocked` profile. The mock adapter implements the current platform-admin contract only; it does not invent future lifecycle routes. The mocked suite runs on Chromium desktop and Pixel 7 mobile.

Browser scenarios cover:

- Login and dashboard load.
- Accessibility smoke on the dashboard with axe.
- Visual regression baselines for branded theme presets and critical operator pages.
- Provision form submission.
- Job detail and retry confirmation dialog.
- Restaurant summary and infra prepare.
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
4. Runs a real browser flow through login, provisioning, job detail, restaurant summary, infra prepare, audit search, and logout.

The backend-assisted suite uses a unique restaurant UUID and slug per run. It intentionally runs one Chromium project to avoid concurrent writes to local tenant infra while still exercising a real browser and the real BFF/backend contract.

The Docker helper reuses the existing `guestlantern-backend-local` image when available. Set `PLATFORM_ADMIN_BACKEND_DOCKER_BUILD=1 npm run test:e2e:backend` to force a rebuild.
