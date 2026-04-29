# Architecture

## BFF Boundary

The browser calls only this Next.js app. Next route handlers call `platform-admin-api` and attach platform bearer tokens from httpOnly cookies. This keeps access and refresh tokens out of browser-readable storage.

Routes:

- `/api/auth/login` authenticates and sets token plus CSRF cookies.
- `/api/auth/session` loads `/platform/bootstrap` and refreshes tokens on 401 when possible.
- `/api/auth/logout` revokes the backend session and clears local cookies.
- `/api/platform/*` forwards current-contract platform routes with bearer auth and CSRF protection for mutations.
- `/api/health/*` forwards unauthenticated health/runtime probes.

## Module Boundaries

- `src/lib/api`: DTOs, browser API client, status helpers, error normalization.
- `src/lib/server`: backend fetch/proxy logic and test mock adapter.
- `src/lib/security`: cookie names/options and CSRF checks.
- `src/lib/validation`: zod schemas for operator inputs.
- `src/features/*`: feature-level pages and forms.
- `src/components/*`: reusable layout and UI components.

UI components do not know about bearer tokens or backend transport. Route handlers do not render UI. Validation schemas are shared by forms and tests.

## Polling

Provisioning jobs in `queued` or `running` state are polled by the browser. The interval is configurable with `NEXT_PUBLIC_JOB_POLL_INTERVAL_MS`. Completed, failed, and cancelled jobs are not continuously polled.

## Current Backend Gaps

The current OpenAPI contract has no restaurant list/search endpoint and no lifecycle routes for backup, disable, re-enable, or permanent delete. V1 uses provisioning jobs plus direct UUID lookup as the tenant index and marks lifecycle controls as backend-blocked.
