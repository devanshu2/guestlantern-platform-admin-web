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
npm run test:e2e
```

Playwright starts the app with `PLATFORM_ADMIN_API_MOCK=1`. The mock adapter implements the current platform-admin contract only; it does not invent future lifecycle routes.

Browser scenarios cover:

- Login and dashboard load.
- Accessibility smoke on the dashboard with axe.
- Provision form submission.
- Job detail and retry confirmation dialog.
- Restaurant summary and infra prepare.
- Scoped audit search.

## Backend-Assisted Smoke

For real backend verification:

1. Start the platform admin backend from `../backend`.
2. Run `make smoke-platform-admin-api` from the backend repo.
3. Run this app with `PLATFORM_ADMIN_API_MOCK=0`.
4. Exercise login, provisioning, jobs, summary repair, and audit flows in a browser.
